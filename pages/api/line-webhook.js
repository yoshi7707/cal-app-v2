import prisma from '../../lib/prisma';
import { createGoogleCalendarEvent } from '../../lib/googleCalendar';
import crypto from 'crypto';

// This is a simple in-memory store for conversation states.
const conversationState = {};

const channelSecret = process.env.LINE_CHANNEL_SECRET;
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

const LINE_API_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

// Disable Next.js body parser for this route to handle raw body for signature validation
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to buffer the request
function buffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
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
      replyToken: replyToken,
      messages: [{ type: 'text', text: messageText }],
    }),
  });
}

/**
 * Fetches a user's profile from the LINE API.
 * @param {string} userId The user's LINE ID.
 * @returns {Promise<object|null>} The user's profile object or null on failure.
 */
async function getUserProfile(userId) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !userId) {
    console.error('Missing LINE token or userId for profile fetch.');
    return null;
  }

  try {
    const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Failed to fetch LINE profile for ${userId}:`, response.status, errorBody);
      return null;
    }

    return await response.json(); // Returns { displayName, userId, pictureUrl, statusMessage }
  } catch (error) {
    console.error('Error calling LINE profile API:', error);
    return null;
  }
}


function uniqueArray(arr) {
  return [...new Set(arr)];
}

function formatDateTimeLabel(item) {
  // item: { date, startTime, endTime } where startTime/endTime are ISO strings
  try {
    const date = item.date || (item.startTime ? item.startTime.split('T')[0] : '');

    // Helper to format an ISO string into HH:mm in JST
    const fmtHM_JST = (isoString) => {
      if (!isoString) return '';
      // Create a Date object, then format it specifically for the 'Asia/Tokyo' timezone
      return new Date(isoString).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Tokyo'
      });
    };

    const start = fmtHM_JST(item.startTime);
    const end = fmtHM_JST(item.endTime);

    return `${date} ${start || ''}${end ? '-' + end : ''}`.trim();
  } catch (e) {
    console.error("Error formatting date time label:", e);
    return JSON.stringify(item);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const rawBody = await buffer(req);
  const signature = req.headers['x-line-signature'];

  const expectedSignature = crypto
    .createHmac('sha256', channelSecret)
    .update(rawBody)
    .digest('base64');

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const webhookBody = JSON.parse(rawBody.toString());

  for (const event of webhookBody.events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userId = event.source.userId;
      const userText = event.message.text.trim();
      const replyToken = event.replyToken;

      // --- AUTOMATED REGISTRATION LOGIC ---
      const registrationCommand = userText.match(/^(ID登録|id登録)\s+(.+)$/);
      if (registrationCommand) {
        const roleInput = registrationCommand[2].trim();
        const roleMapping = {
          '導師': 'doushi',
          'doushi': 'doushi',
          '音響': 'onkyo',
          'onkyo': 'onkyo',
          '司会': 'shikai',
          'shikai': 'shikai',
        };

        const role = roleMapping[roleInput.toLowerCase()];

        if (!role) {
          await replyToUser(replyToken, `役割名が無効です。「導師」「音響」「司会」のいずれかを指定してください。\n例： ID登録 導師`);
          continue;
        }

        const userProfile = await getUserProfile(userId);

        if (!userProfile) {
          await replyToUser(replyToken, 'プロフィールの取得に失敗しました。ボットをブロックしていないか確認してください。');
          continue;
        }

        const { displayName } = userProfile;

        try {
          await prisma.settingsItem.upsert({
            where: {
              type_name: { type: role, name: displayName }
            },
            update: { lineId: userId },
            create: { type: role, name: displayName, lineId: userId },
          });

          await replyToUser(replyToken, `登録が完了しました。\n名前： ${displayName}\n役割： ${roleInput}`);
        } catch (dbError) {
          console.error('DB error during registration:', dbError);
          await replyToUser(replyToken, 'データベースへの登録中にエラーが発生しました。');
        }
        continue;
      }
      // --- END OF REGISTRATION LOGIC ---

      let state = conversationState[userId] || { step: 'idle' };

      if (userText.toLowerCase() === 'cancel' || userText === 'キャンセル') {
        delete conversationState[userId];
        await replyToUser(replyToken, '行事作成をキャンセルしました。');
        continue;
      }

      // Start: show selections from settings data
      if (state.step === 'idle' && (userText.toLowerCase() === 'new event' || userText === '新規行事')) {
        try {
          const settingsItems = await prisma.settingsItem.findMany({
            orderBy: { createdAt: 'desc' },
          });

          const groupedSettings = settingsItems.reduce((acc, item) => {
            acc[item.type] = acc[item.type] || [];
            acc[item.type].push(item.name);
            return acc;
          }, {});

          const eventNames = groupedSettings.event || [];
          const doushis = groupedSettings.doushi || [];
          const onkyos = groupedSettings.onkyo || [];
          const shikais = groupedSettings.shikai || [];

          if (eventNames.length === 0) {
            state = { step: 'awaiting_name', data: {} };
            conversationState[userId] = state;
            await replyToUser(replyToken, 'プリセット行事が見つかりません。行事名を入力してください。');
            continue;
          }

          state = {
            step: 'select_name',
            data: {},
            options: {
              names: eventNames,
              doushis,
              onkyos,
              shikais
            },
            meta: {}
          };
          conversationState[userId] = state;

          const listText = eventNames.map((n, i) => `${i + 1}) ${n}`).join('\n');
          await replyToUser(replyToken, `プリセット行事から番号で選択するか、「カスタム」と入力してください：\n${listText}\n新しい行事名を入力する場合は「カスタム」と入力してください。`);
        } catch (err) {
          console.error('DB error when fetching settings:', err);
          state = { step: 'awaiting_name', data: {} };
          conversationState[userId] = state;
          await replyToUser(replyToken, 'プリセット行事の取得に失敗しました。行事名を入力してください。');
        }
        continue;
      }

      // Selecting an existing name
      if (state.step === 'select_name') {
        const lower = userText.toLowerCase();
        if (lower === 'custom' || lower === 'カスタム') {
          state.step = 'awaiting_name';
          conversationState[userId] = state;
          await replyToUser(replyToken, '新しい行事名を入力してください。');
          continue;
        }
        const idx = parseInt(userText, 10) - 1;
        if (Number.isInteger(idx) && state.options && state.options.names && state.options.names[idx]) {
          const chosenName = state.options.names[idx];
          state.data.eventName = chosenName;

          const startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 1);

          const dateOptions = [];
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            dateOptions.push(`${yyyy}-${mm}-${dd}`);
          }

          state.options.dateOptions = dateOptions;
          state.options.timeTemplate = { startHour: 9, endHour: 20, stepMinutes: 30 };
          state.meta = state.meta || {};
          state.meta.datetimeStage = 'date';
          state.step = 'select_datetime';
          conversationState[userId] = state;

          const dateListText = dateOptions.map((d, i) => `${i + 1}) ${d}`).join('\n');
          await replyToUser(replyToken, `"${chosenName}"の日付を番号で選択してください（今日から1ヶ月後まで）、または「カスタム」と入力してください：\n${dateListText}`);
          continue;
        } else {
          await replyToUser(replyToken, '無効な選択です。行事名の番号または「カスタム」で返信してください。');
          continue;
        }
      }

      // Selecting datetime from existing data
      if (state.step === 'select_datetime') {
        const lower = userText.toLowerCase();
        if (lower === 'custom' || lower === 'カスタム') {
          state.step = 'select_year';
          const base = new Date();
          base.setMonth(base.getMonth() + 1);
          state.meta = state.meta || {};
          state.meta.baseDate = {
            year: base.getFullYear(),
            month: base.getMonth() + 1,
            day: base.getDate(),
          };
          conversationState[userId] = state;
          await replyToUser(replyToken, `年を選択してください：\n1) ${state.meta.baseDate.year}\n2) ${state.meta.baseDate.year + 1}\n番号で返信してください。`);
          continue;
        }
        const num = parseInt(userText, 10);
        if (!Number.isInteger(num)) {
          await replyToUser(replyToken, '日付または時刻の番号で返信するか、「カスタム」と入力してください。');
          continue;
        }

        if (state.meta && state.meta.datetimeStage === 'date') {
          const dateIdx = num - 1;
          if (!state.options || !state.options.dateOptions || dateIdx < 0 || dateIdx >= state.options.dateOptions.length) {
            await replyToUser(replyToken, `Invalid selection. Reply with a number between 1 and ${state.options.dateOptions.length}.`);
            continue;
          }
          const chosenDate = state.options.dateOptions[dateIdx];
          const tpl = state.options.timeTemplate || { startHour: 9, endHour: 20, stepMinutes: 30 };
          const slots = [];
          for (let minutes = tpl.startHour * 60; minutes < tpl.endHour * 60; minutes += tpl.stepMinutes) {
            const sh = Math.floor(minutes / 60);
            const sm = minutes % 60;
            const eh = Math.floor((minutes + tpl.stepMinutes) / 60);
            const em = (minutes + tpl.stepMinutes) % 60;

            const startTimeStrJST = `${chosenDate}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00+09:00`;
            const endTimeStrJST = `${chosenDate}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00+09:00`;

            const startISO = new Date(startTimeStrJST).toISOString();
            const endISO = new Date(endTimeStrJST).toISOString();

            slots.push({ date: chosenDate, startTime: startISO, endTime: endISO });
          }
          state.options.timeSlots = slots;
          state.meta.datetimeStage = 'time';
          state.step = 'select_datetime';
          conversationState[userId] = state;
          const timesText = slots.map((s, i) => `${i + 1}) ${formatDateTimeLabel(s)}`).join('\n');
          await replyToUser(replyToken, `${chosenDate}の時刻を番号で選択してください：\n${timesText}`);
          continue;
        }

        const timeIdx = num - 1;
        if (!state.options || !state.options.timeSlots || timeIdx < 0 || timeIdx >= state.options.timeSlots.length) {
          await replyToUser(replyToken, `無効な選択です。1から${state.options.timeSlots.length}までの番号で返信してください。`);
          continue;
        }
        const chosen = state.options.timeSlots[timeIdx];
        state.data.date = chosen.date;
        state.data.startTime = chosen.startTime;
        state.data.endTime = chosen.endTime;
        state.step = 'select_role';
        state.meta = { rolesOrder: ['doushi', 'onkyo', 'shikai'], roleIndex: 0 };
        const roleOptions = {
          doushi: state.options.doushis || [],
          onkyo: state.options.onkyos || [],
          shikai: state.options.shikais || [],
        };
        state.options.roles = roleOptions;
        conversationState[userId] = state;

        const currentRole = state.meta.rolesOrder[state.meta.roleIndex];
        const opts = (state.options.roles[currentRole] || []);
        const list = `1) なし\n` + (opts.length ? opts.map((o, i) => `${i + 2}) ${o}`).join('\n') : '(プリセット名なし)');
        const roleNames = {
          'doushi': '導師',
          'onkyo': '音響',
          'shikai': '司会'
        };
        const roleName = roleNames[currentRole] || currentRole;
        await replyToUser(replyToken, `${roleName}を番号で選択するか、直接名前を入力してください：\n${list}`);
        continue;
      }

      // Selecting role from recent data
      if (state.step === 'select_role') {
        const rolesOrder = state.meta.rolesOrder;
        let idx = state.meta.roleIndex;
        const currentRole = rolesOrder[idx];

        const num = parseInt(userText, 10);
        if (Number.isInteger(num)) {
          if (num === 1) {
            state.data[currentRole] = 'N/A';
          } else {
            const opts = state.options.roles[currentRole] || [];
            const selectedName = opts[num - 2];
            if (selectedName) {
              state.data[currentRole] = selectedName;
            } else {
              await replyToUser(replyToken, `無効な番号です。リストから選択してください。`);
              continue;
            }
          }
        } else {
          state.data[currentRole] = userText;
        }

        idx += 1;
        if (idx >= rolesOrder.length) {
          state.step = 'awaiting_comment';
          conversationState[userId] = state;
          await replyToUser(replyToken, '役割が設定されました。コメントはありますか？\n1) なし\nコメント内容を直接入力することもできます。');
          continue;
        } else {
          state.meta.roleIndex = idx;
          conversationState[userId] = state;
          const nextRole = rolesOrder[idx];
          const nextOpts = (state.options.roles[nextRole] || []);
          const list = `1) なし\n` + (nextOpts.length ? nextOpts.map((o, i) => `${i + 2}) ${o}`).join('\n') : '(プリセット名なし)');
          const roleNames = {
            'doushi': '導師',
            'onkyo': '音響',
            'shikai': '司会'
          };
          const roleName = roleNames[nextRole] || nextRole;
          await replyToUser(replyToken, `${roleName}を番号で選択するか、直接名前を入力してください：\n${list}`);
          continue;
        }
      }

      // Fallback: original free-form flows for name/date if user chose custom or DB empty
      if (state.step === 'awaiting_name') {
        state.data.eventName = userText;
        state.step = 'select_year';
        conversationState[userId] = state;
        await replyToUser(replyToken, `了解しました。"${userText}"の年を選択してください：\n1) 2025\n2) 2026\n番号で返信してください。`);
        continue;
      } else if (state.step === 'awaiting_comment') {
        if (userText === '1' || userText.toLowerCase() === 'none' || userText === 'なし') {
          state.data.comment = '';
        } else {
          state.data.comment = userText;
        }

        // --- NEW: Move to confirmation step ---
        state.step = 'awaiting_confirmation';
        conversationState[userId] = state;

        // Format the summary message
        const timePart = formatDateTimeLabel({ startTime: state.data.startTime, endTime: state.data.endTime }).split(' ')[1] || '';
        const summary = `
以下の内容で登録します。

行事名: ${state.data.eventName}
日付: ${state.data.date}
時間: ${timePart}
導師: ${state.data.doushi || 'N/A'}
音響: ${state.data.onkyo || 'N/A'}
司会: ${state.data.shikai || 'N/A'}
コメント: ${state.data.comment || 'なし'}
        `.trim();

        await replyToUser(replyToken, `${summary}\n\nこれで登録していいですか？\n1) はい\n2) いいえ`);
        continue;

      } else if (state.step === 'awaiting_confirmation') {
        const confirmation = userText.trim();

        if (confirmation === '1') {
          try {
            const newEvent = await prisma.event.create({
              data: {
                eventName: state.data.eventName,
                date: state.data.date,
                startTime: state.data.startTime,
                endTime: state.data.endTime,
                doushi: state.data.doushi || 'N/A',
                onkyo: state.data.onkyo || 'N/A',
                shikai: state.data.shikai || 'N/A',
                comment: state.data.comment || '',
              }
            });

            const googleEventData = {
              title: newEvent.eventName,
              description: `導師: ${newEvent.doushi}\n音響: ${newEvent.onkyo}\n司会: ${newEvent.shikai}\n\nコメント: ${newEvent.comment}`,
              start: newEvent.startTime,
              end: newEvent.endTime,
              allDay: false,
            };
            const googleEvent = await createGoogleCalendarEvent(googleEventData);

            await prisma.event.update({
              where: { id: newEvent.id },
              data: { googleEventId: googleEvent.id },
            });

            await replyToUser(replyToken, `✅ 完了！行事「${newEvent.eventName}」が作成されました😃`);

          } catch (error) {
            console.error('Failed to create event:', error);
            await replyToUser(replyToken, `申し訳ございません。行事の作成中にエラーが発生しました：${error.message}`);
          } finally {
            delete conversationState[userId];
          }
        } else if (confirmation === '2') {
          delete conversationState[userId];
          await replyToUser(replyToken, '行事作成をキャンセルしました。最初からやり直すには「新規行事」と入力してください。');
        } else {
          await replyToUser(replyToken, '1か2で答えてください。');
        }
        continue;
      }

      // If no matching flow, prompt user quickly
      await replyToUser(replyToken, '新しい行事を作成するには「new event」または「新規行事」と入力してください。キャンセルするには「cancel」と入力してください。');
    }
  }

  res.status(200).json({ success: true });
}