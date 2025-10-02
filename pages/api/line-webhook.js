import prisma from '../../lib/prisma';
import { createGoogleCalendarEvent, updateGoogleCalendarEvent } from '../../lib/googleCalendar';
import crypto from 'crypto';

const conversationState = {};

const channelSecret = process.env.LINE_CHANNEL_SECRET;
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_API_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

export const config = {
  api: { bodyParser: false },
};

// --- Utility functions ---
function buffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function replyToUser(replyToken, messageText) {
  if (!channelAccessToken) {
    console.error('Missing LINE_CHANNEL_ACCESS_TOKEN');
    return;
  }
  await fetch(LINE_API_REPLY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text: messageText }],
    }),
  });
}

// Convert Japanese full-width numbers to half-width
function normalizeNumber(text) {
  const fullWidthToHalfWidth = {
    '１': '1', '２': '2', '３': '3', '４': '4', '５': '5',
    '６': '6', '７': '7', '８': '8', '９': '9', '０': '0'
  };
  let normalized = text;
  for (const [fw, hw] of Object.entries(fullWidthToHalfWidth)) {
    normalized = normalized.replace(new RegExp(fw, 'g'), hw);
  }
  return normalized;
}

// --- Role registration flow handler ---
async function handleRoleRegistration(userId, userText, replyToken, state) {
  const normalizedText = normalizeNumber(userText);
  const cleanText = normalizedText.replace(/[^\d]/g, '');

  // Step: choose role
  if (state.step === 'register_entry') {
    const num = parseInt(cleanText, 10);

    if (num === 4) {
      delete conversationState[userId];
      await replyToUser(replyToken, 'キャンセルしました。');
      return true;
    }

    if (!Number.isInteger(num) || ![1, 2, 3].includes(num)) {
      await replyToUser(replyToken, '無効な選択です。1〜4の番号で選んでください。');
      return true;
    }

    let role = '', roleLabel = '';
    switch (num) {
      case 1: role = 'doushi'; roleLabel = '導師'; break;
      case 2: role = 'onkyo'; roleLabel = '音響'; break;
      case 3: role = 'shikai'; roleLabel = '常駐'; break;
    }

    try {
      const settingsItems = await prisma.settingsItem.findMany({
        where: { type: role },
        orderBy: { createdAt: 'desc' },
      });
      const names = settingsItems.map(i => i.name);
      if (!names || names.length === 0) {
        await replyToUser(replyToken, `${roleLabel}がまだ登録されていません。`);
        delete conversationState[userId];
        return true;
      }
      state.step = 'select_reminder_role_name';
      state.data = { role, roleLabel };
      state.options = { names };
      conversationState[userId] = state;
      const listText = names.map((n, i) => `${i + 1}) ${n}`).join('\n');
      await replyToUser(replyToken, `${roleLabel}を番号で選んでください：\n${listText}`);
    } catch (err) {
      console.error('DB error when fetching role list:', err);
      await replyToUser(replyToken, `${roleLabel}一覧の取得に失敗しました。`);
      delete conversationState[userId];
    }
    return true;
  }

  // Step: choose name
  if (state.step === 'select_reminder_role_name') {
    const idx = parseInt(cleanText, 10) - 1;

    if (!Number.isInteger(idx) || !state.options?.names || idx < 0 || idx >= state.options.names.length) {
      await replyToUser(replyToken, `無効な選択です。1〜${state.options?.names.length}の番号で返信してください。`);
      return true;
    }

    const chosenName = state.options.names[idx];
    state.data.name = chosenName;
    state.step = 'confirm_reminder_role';
    conversationState[userId] = state;
    await replyToUser(replyToken,
      `以下で登録していいですか？\n種類: ${state.data.roleLabel}\n名前: ${chosenName}\n\n1) はい\n2) いいえ`);
    return true;
  }

  // Step: confirm registration
  if (state.step === 'confirm_reminder_role') {
    const choice = parseInt(cleanText, 10);

    if (choice === 1) {
      try {
        const updated = await prisma.settingsItem.updateMany({
          where: { type: state.data.role, name: state.data.name },
          data: { lineId: userId },
        });
        if (updated.count === 0) {
          try {
            await prisma.settingsItem.create({
              data: { type: state.data.role, name: state.data.name, lineId: userId },
            });
          } catch (createErr) {
            if (createErr.code === 'P2002' || (createErr.meta && createErr.meta.target)) {
              const existing = await prisma.settingsItem.findFirst({
                where: { name: state.data.name },
              });
              if (existing) {
                await prisma.settingsItem.update({
                  where: { id: existing.id },
                  data: { lineId: userId },
                });
                await replyToUser(replyToken,
                  `⚠️ 注意: 同じ名前のレコードが既に存在したため、その既存レコード(type: ${existing.type})の lineId を更新しました。`
                );
              } else {
                await replyToUser(replyToken, 'エラー: 既存レコードが見つかりません。');
              }
            } else { throw createErr; }
          }
        }
        await replyToUser(replyToken,
          `✅ 登録が完了しました。\n種類: ${state.data.roleLabel}\n名前: ${state.data.name}`);
      } catch (err) {
        console.error('DB error during role registration:', err);
        await replyToUser(replyToken, '⚠️ データベースへの登録中にエラーが発生しました。');
      } finally {
        delete conversationState[userId];
      }
    } else if (choice === 2) {
      delete conversationState[userId];
      await replyToUser(replyToken, 'キャンセルしました。');
    } else {
      await replyToUser(replyToken, '1か2で答えてください。');
    }
    return true;
  }

  return false; // not handled here
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const rawBody = await buffer(req);
  const signature = req.headers['x-line-signature'];
  const expectedSignature = crypto.createHmac('sha256', channelSecret).update(rawBody).digest('base64');
  if (signature !== expectedSignature) return res.status(401).json({ error: 'Invalid signature' });

  const webhookBody = JSON.parse(rawBody.toString());

  for (const event of webhookBody.events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userId = event.source.userId;
      const userText = event.message.text.trim();
      const replyToken = event.replyToken;
      let state = conversationState[userId] || { step: 'idle' };

      // Entry point
      if (userText === '登録') {
        state.step = 'register_entry';
        conversationState[userId] = state;
        await replyToUser(replyToken, `リマインダ登録を行いますか？
1) 導師
2) 音響
3) 常駐
4) いいえ`);
        continue;
      }

      // Delegate to role registration flow
      const handled = await handleRoleRegistration(userId, userText, replyToken, state);
      if (handled) continue;

      // --- fallback ---
      await replyToUser(replyToken, `登録もしくは新規行事と入力してください：`);
    }
  }

  res.status(200).json({ success: true });
}