import prisma from '../../lib/prisma';
import { createGoogleCalendarEvent, updateGoogleCalendarEvent } from '../../lib/googleCalendar';
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

      // Get or initialize conversation state
      let state = conversationState[userId] || { step: 'idle' };

      // Handle initial menu trigger
      if (userText === '' || userText === 'リマインダ' || userText.toLowerCase() === 'reminder') {
        if (state.step === 'idle') {
          await replyToUser(replyToken, `ご希望の操作を番号で選んでください：\n1) 行事入力\n2) リマインダ登録`);
          continue;
        }
      }

      // Handle reminder registration flow
      if (state.step === 'select_reminder_type') {
        const num = parseInt(userText, 10);
        if ([1, 2, 3].includes(num)) {
          let role = '', roleName = '';
          if (num === 1) { role = 'doushi'; roleName = '導師'; }
          if (num === 2) { role = 'onkyo'; roleName = '音響'; }
          if (num === 3) { role = 'shikai'; roleName = '常駐'; }

          const candidates = await prisma.settingsItem.findMany({ where: { type: role }, orderBy: { createdAt: 'desc' } });
          state.step = 'select_reminder_name';
          state.data = { role, roleName, candidates };
          conversationState[userId] = state;

          if (candidates.length > 0) {
            const list = candidates.map((c, i) => `${i + 1}) ${c.name}`).join('\n');
            await replyToUser(replyToken, `${roleName} の候補から番号を選ぶか、直接名前を入力してください:\n${list}`);
          } else {
            await replyToUser(replyToken, `${roleName} の候補がありません。直接名前を入力してください。`);
          }
        } else {
          await replyToUser(replyToken, '無効な選択です。番号で選んでください。');
        }
        continue;
      }

      if (state.step === 'select_reminder_name') {
        const { candidates, role, roleName } = state.data;
        let chosenName = userText;
        const num = parseInt(userText, 10);
        if (Number.isInteger(num) && candidates[num - 1]) chosenName = candidates[num - 1].name;

        state.step = 'confirm_reminder';
        state.data.name = chosenName;
        conversationState[userId] = state;

        await replyToUser(replyToken, `以下の内容で登録しますか？\n名前: ${chosenName}\n役割: ${roleName}\n1) はい\n2) いいえ`);
        continue;
      }

      if (state.step === 'confirm_reminder') {
        const { role, roleName, name } = state.data;
        if (userText === '1') {
          try {
            await prisma.settingsItem.upsert({
              where: { type_name: { type: role, name } },
              update: { lineId: userId },
              create: { type: role, name, lineId: userId },
            });
            await replyToUser(replyToken, `✅ 登録が完了しました。\n名前: ${name}\n役割: ${roleName}`);
          } catch (e) {
            console.error('DB error', e);
            await replyToUser(replyToken, 'DB登録中にエラーが発生しました。');
          }
          delete conversationState[userId];
        } else if (userText === '2') {
          delete conversationState[userId];
          await replyToUser(replyToken, '登録をキャンセルしました。');
        } else {
          await replyToUser(replyToken, '1) はい または 2) いいえ を入力してください。');
        }
        continue;
      }

      // --- AUTOMATED REGISTRATION LOGIC ---
      const registrationCommand = userText.match(/^(ID登録|id登録)\s+(.+)$/);
      if (registrationCommand) {
        const roleInput = registrationCommand[2].trim();
        const roleMapping = {
          '導師': 'doushi',
          'doushi': 'doushi',
          '音響': 'onkyo',
          'onkyo': 'onkyo',
          '常駐': 'shikai',
          'shikai': 'shikai',
        };

        const role = roleMapping[roleInput.toLowerCase()];

        if (!role) {
          await replyToUser(replyToken, `役割名が無効です。「導師」「音響」「常駐」のいずれかを指定してください。\n例： ID登録 導師`);
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

      const userNum = parseInt(userText, 10);
      if (state.step === 'idle' && Number.isInteger(userNum) && userNum >= 1 && userNum <= 2) {
        if (userNum === 1) {
          state.step = 'select_event_type';
          conversationState[userId] = state;
          await replyToUser(replyToken, `行事の種類を番号で選んでください：\n1) 「復活の祈り」\n2) 常駐\n3) その他`);
        } else if (userNum === 2) {
          state.step = 'select_reminder_type';
          conversationState[userId] = state;
          await replyToUser(replyToken, `リマインダーの種類を番号で選んでください：\n1) 導師\n2) 音響\n3) 常駐`);
        }
        continue;
      }

      if (state.step === 'select_event_type') {
        const userNum = parseInt(userText, 10);
        if (Number.isInteger(userNum) && userNum >= 1 && userNum <= 3) {
          if (userNum === 1 || userNum === 2) {
            state.step = 'select_date_from_list';
            state.data = { eventName: userNum === 1 ? '「復活の祈り」' : '常駐' };
            
            const dateOptions = [];
            const today = new Date();
            for (let i = 0; i < 30; i++) {
              const date = new Date(today);
              date.setDate(today.getDate() + i);
              const yyyy = date.getFullYear();
              const mm = String(date.getMonth() + 1).padStart(2, '0');
              const dd = String(date.getDate()).padStart(2, '0');
              dateOptions.push(`${yyyy}-${mm}-${dd}`);
            }
            state.options = { dateOptions };
            conversationState[userId] = state;

            const dateListText = dateOptions.map((d, i) => `${i + 1}) ${d}`).join('\n');
            await replyToUser(replyToken, `日付を選んでください：\n${dateListText}`);

          } else if (userNum === 3) {
            // Start the "その他" flow by triggering the existing "new event" flow
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
                
              } else {
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
              }
            } catch (err) {
              console.error('DB error when fetching settings:', err);
              state = { step: 'awaiting_name', data: {} };
              conversationState[userId] = state;
              await replyToUser(replyToken, 'プリセット行事の取得に失敗しました。行事名を入力してください。');
            }
          }
        } else {
          await replyToUser(replyToken, '無効な選択です。番号で選んでください。');
        }
        continue;
      }

      if (state.step === 'select_date_from_list') {
        const userNum = parseInt(userText, 10);
        if (Number.isInteger(userNum) && state.options && state.options.dateOptions && userNum >= 1 && userNum <= state.options.dateOptions.length) {
          const chosenDate = state.options.dateOptions[userNum - 1];
          state.data.date = chosenDate;

          if (state.data.eventName === '「復活の祈り」') {
            state.step = 'select_fukkatsu_time_slot';
            conversationState[userId] = state;
            await replyToUser(replyToken, `時間を選んでください：\n1) 10:00 - 11:00\n2) 13:00 - 14:00\n3) 19:00 - 20:00`);
          } else {
            const tpl = { startHour: 8, endHour: 22, stepMinutes: 30 };
            const startTimes = [];
            for (let minutes = tpl.startHour * 60; minutes < tpl.endHour * 60; minutes += tpl.stepMinutes) {
              const h = Math.floor(minutes / 60);
              const m = minutes % 60;
              const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              startTimes.push(timeStr);
            }

            state.options.startTimes = startTimes;
            state.step = 'select_start_time';
            conversationState[userId] = state;

            const timesText = startTimes.map((t, i) => `${i + 1}) ${t}`).join('\n');
            await replyToUser(replyToken, `${chosenDate}の開始時刻を番号で選択してください：\n${timesText}`);
          }
        } else {
          await replyToUser(replyToken, '無効な選択です。番号で選んでください。');
        }
        continue;
      }

      if (state.step === 'select_fukkatsu_time_slot') {
        const userNum = parseInt(userText, 10);
        if (Number.isInteger(userNum) && userNum >= 1 && userNum <= 3) {
          let startTime, endTime;
          const chosenDate = state.data.date;
          if (userNum === 1) {
            startTime = new Date(`${chosenDate}T10:00:00+09:00`);
            endTime = new Date(`${chosenDate}T11:00:00+09:00`);
          } else if (userNum === 2) {
            startTime = new Date(`${chosenDate}T13:00:00+09:00`);
            endTime = new Date(`${chosenDate}T14:00:00+09:00`);
          } else if (userNum === 3) {
            startTime = new Date(`${chosenDate}T19:00:00+09:00`);
            endTime = new Date(`${chosenDate}T20:00:00+09:00`);
          }

          state.data.startTime = startTime.toISOString();
          state.data.endTime = endTime.toISOString();

          // --- Proceed to role selection (original flow continues here) ---
          state.step = 'select_role';
          state.meta = { rolesOrder: ['doushi'], roleIndex: 0 };
          const settingsItems = await prisma.settingsItem.findMany({
            orderBy: { createdAt: 'desc' },
          });

          const groupedSettings = settingsItems.reduce((acc, item) => {
            acc[item.type] = acc[item.type] || [];
            acc[item.type].push(item.name);
            return acc;
          }, {});
          
          const roleOptions = {
            doushi: groupedSettings.doushi || [],
            onkyo: groupedSettings.onkyo || [],
            shikai: groupedSettings.shikai || [],
          };
          state.options.roles = roleOptions;
          conversationState[userId] = state;

          const currentRole = state.meta.rolesOrder[state.meta.roleIndex];
          const opts = (state.options.roles[currentRole] || []);
          const list = `1) なし\n` + (opts.length ? opts.map((o, i) => `${i + 2}) ${o}`).join('\n') : '(プリセット名なし)');
          const roleNames = {
            'doushi': '導師',
            'onkyo': '音響',
            'shikai': '常駐'
          };
          const roleName = roleNames[currentRole] || currentRole;
          await replyToUser(replyToken, `${roleName}を番号で選択するか、直接名前を入力してください：\n${list}`);

        } else {
          await replyToUser(replyToken, '無効な選択です。番号で選んでください。');
        }
        continue;
      }

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
          state.data.date = chosenDate; // Store the chosen date

          // --- MODIFICATION: Generate start times only ---
          const tpl = state.options.timeTemplate || { startHour: 8, endHour: 22, stepMinutes: 30 };
          const startTimes = [];
          for (let minutes = tpl.startHour * 60; minutes < tpl.endHour * 60; minutes += tpl.stepMinutes) {
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            startTimes.push(timeStr);
          }

          state.options.startTimes = startTimes;
          state.step = 'select_start_time'; // Move to the new start time selection step
          conversationState[userId] = state;

          const timesText = startTimes.map((t, i) => `${i + 1}) ${t}`).join('\n');
          await replyToUser(replyToken, `${chosenDate}の開始時刻を番号で選択してください：\n${timesText}`);
          continue;
        }

        // This part of the logic is now replaced by select_start_time and select_end_time
        // The 'time' stage of 'select_datetime' is no longer used.
        await replyToUser(replyToken, '予期しないステップです。初めからやり直してください。');
        continue;
      }

      // --- NEW STEP: Handle start time selection ---
      if (state.step === 'select_start_time') {
        const num = parseInt(userText, 10);
        if (!Number.isInteger(num) || !state.options || !state.options.startTimes || num < 1 || num > state.options.startTimes.length) {
          await replyToUser(replyToken, `無効な選択です。1から${state.options.startTimes.length}までの番号で返信してください。`);
          continue;
        }

        const chosenTimeStr = state.options.startTimes[num - 1];
        const [startHour, startMinute] = chosenTimeStr.split(':').map(Number);

        // Create and store the full ISO string for the start time
        const startTimeStrJST = `${state.data.date}T${chosenTimeStr}:00+09:00`;
        state.data.startTime = new Date(startTimeStrJST).toISOString();

        // Generate end time options, starting from the selected start time
        const tpl = state.options.timeTemplate || { startHour: 8, endHour: 22, stepMinutes: 30 };
        const endTimes = [];
        const startTotalMinutes = startHour * 60 + startMinute;

        for (let minutes = startTotalMinutes + tpl.stepMinutes; minutes <= tpl.endHour * 60; minutes += tpl.stepMinutes) {
          const h = Math.floor(minutes / 60);
          const m = minutes % 60;
          const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          endTimes.push(timeStr);
        }

        state.options.endTimes = endTimes;
        state.step = 'select_end_time';
        conversationState[userId] = state;

        const timesText = endTimes.map((t, i) => `${i + 1}) ${t}`).join('\n');
        await replyToUser(replyToken, `終了時刻を番号で選択してください：\n${timesText}`);
        continue;
      }

      // --- NEW STEP: Handle end time selection ---
      if (state.step === 'select_end_time') {
        const num = parseInt(userText, 10);
        if (!Number.isInteger(num) || !state.options || !state.options.endTimes || num < 1 || num > state.options.endTimes.length) {
          await replyToUser(replyToken, `無効な選択です。1から${state.options.endTimes.length}までの番号で返信してください。`);
          continue;
        }

        const chosenTimeStr = state.options.endTimes[num - 1];

        // Create and store the full ISO string for the end time
        const endTimeStrJST = `${state.data.date}T${chosenTimeStr}:00+09:00`;
        state.data.endTime = new Date(endTimeStrJST).toISOString();

        // --- Proceed to role selection (original flow continues here) ---
        state.step = 'select_role';
        if (state.data.eventName === '常駐') {
            state.meta = { rolesOrder: ['shikai'], roleIndex: 0 };
        } else {
            state.meta = { rolesOrder: ['doushi', 'onkyo'], roleIndex: 0 };
        }
        
        const settingsItems = await prisma.settingsItem.findMany({
          orderBy: { createdAt: 'desc' },
        });

        const groupedSettings = settingsItems.reduce((acc, item) => {
          acc[item.type] = acc[item.type] || [];
          acc[item.type].push(item.name);
          return acc;
        }, {});
        
        const roleOptions = {
          doushi: groupedSettings.doushi || [],
          onkyo: groupedSettings.onkyo || [],
          shikai: groupedSettings.shikai || [],
        };
        state.options.roles = roleOptions;
        conversationState[userId] = state;

        const currentRole = state.meta.rolesOrder[state.meta.roleIndex];
        const opts = (state.options.roles[currentRole] || []);
        const list = `1) なし\n` + (opts.length ? opts.map((o, i) => `${i + 2}) ${o}`).join('\n') : '(プリセット名なし)');
        const roleNames = {
          'doushi': '導師',
          'onkyo': '音響',
          'shikai': '常駐'
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
          await replyToUser(replyToken, `役割が設定されました。コメントはありますか？\n1) なし\nコメント内容を直接入力することもできます。`);
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
            'shikai': '常駐'
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
        const summary = `\n以下の内容で登録します。\n\n行事名: ${state.data.eventName}\n日付: ${state.data.date}\n時間: ${timePart}\n導師: ${state.data.doushi || 'N/A'}\n音響: ${state.data.onkyo || 'N/A'}\n常駐: ${state.data.shikai || 'N/A'}\nコメント: ${state.data.comment || 'なし'}\n        `.trim();

        await replyToUser(replyToken, `${summary}\n\nこれで登録していいですか？\n1) はい\n2) いいえ`);
        continue;

      } else if (state.step === 'awaiting_confirmation') {
        const confirmation = userText.trim();

        if (confirmation === '1') {
          try {
            if (state.data.eventName === '「復活の祈り」') {
              const existingEvent = await prisma.event.findFirst({
                where: {
                  eventName: '「復活の祈り」',
                  startTime: state.data.startTime,
                },
              });

              if (existingEvent) {
                console.log('Updating existing event:', existingEvent.id);
                // Update existing event
                const updatedEvent = await prisma.event.update({
                  where: { id: existingEvent.id },
                  data: { doushi: state.data.doushi || 'N/A' },
                });
                console.log('Event updated in database:', updatedEvent);

                // Also update Google Calendar event
                if (updatedEvent.googleEventId) {
                    try {
                        console.log('Updating Google Calendar event:', updatedEvent.googleEventId);
                        const googleEventData = {
                            title: updatedEvent.eventName,
                            description: `導師: ${updatedEvent.doushi}\n音響: ${updatedEvent.onkyo}\n常駐: ${updatedEvent.shikai}\n\nコメント: ${updatedEvent.comment}`,
                            start: updatedEvent.startTime,
                            end: updatedEvent.endTime,
                            allDay: false,
                        };
                        const updatedGoogleEvent = await updateGoogleCalendarEvent(updatedEvent.googleEventId, googleEventData);
                        console.log('Google Calendar event updated successfully:', updatedGoogleEvent);
                    } catch (error) {
                        console.error('Error updating Google Calendar event:', error);
                        if (error.message.includes("Not Found")) {
                            console.log('Google Calendar event not found, creating new one...');
                            // Event not found in Google Calendar, create a new one
                            const googleEventData = {
                                title: updatedEvent.eventName,
                                description: `導師: ${updatedEvent.doushi}\n音響: ${updatedEvent.onkyo}\n常駐: ${updatedEvent.shikai}\n\nコメント: ${updatedEvent.comment}`,
                                start: updatedEvent.startTime,
                                end: updatedEvent.endTime,
                                allDay: false,
                            };
                            const newGoogleEvent = await createGoogleCalendarEvent(googleEventData);
                            console.log('New Google Calendar event created:', newGoogleEvent);
                            await prisma.event.update({
                                where: { id: updatedEvent.id },
                                data: { googleEventId: newGoogleEvent.id },
                            });
                            console.log('Database updated with new Google Event ID');
                        } else {
                            console.error('Google Calendar update failed with error:', error);
                            // Don't throw error, continue with database event
                        }
                    }
                } else {
                    console.log('No googleEventId found, creating new Google Calendar event...');
                    try {
                        const googleEventData = {
                            title: updatedEvent.eventName,
                            description: `導師: ${updatedEvent.doushi}\n音響: ${updatedEvent.onkyo}\n常駐: ${updatedEvent.shikai}\n\nコメント: ${updatedEvent.comment}`,
                            start: updatedEvent.startTime,
                            end: updatedEvent.endTime,
                            allDay: false,
                        };
                        const newGoogleEvent = await createGoogleCalendarEvent(googleEventData);
                        console.log('New Google Calendar event created for existing event:', newGoogleEvent);
                        await prisma.event.update({
                            where: { id: updatedEvent.id },
                            data: { googleEventId: newGoogleEvent.id },
                        });
                        console.log('Database updated with Google Event ID');
                    } catch (googleError) {
                        console.error('Failed to create Google Calendar event for existing event:', googleError);
                        // Continue without Google Calendar integration
                    }
                }

                await replyToUser(replyToken, `✅ 完了！行事「${updatedEvent.eventName}」の導師を更新しました😃`);

              } else {
                console.log('Creating new 復活の祈り event...');
                // Create new event
                const newEvent = await prisma.event.create({
                  data: {
                    eventName: state.data.eventName,
                    date: state.data.date,
                    startTime: state.data.startTime,
                    endTime: state.data.endTime,
                    doushi: state.data.doushi || 'N/A',
                    onkyo: 'N/A',
                    shikai: 'N/A',
                    comment: state.data.comment || '',
                  }
                });
                console.log('New event created in database:', newEvent);

                try {
                  const googleEventData = {
                    title: newEvent.eventName,
                    description: `導師: ${newEvent.doushi}\n音響: ${newEvent.onkyo}\n常駐: ${newEvent.shikai}\n\nコメント: ${newEvent.comment}`,
                    start: newEvent.startTime,
                    end: newEvent.endTime,
                    allDay: false,
                  };
                  console.log('Creating Google Calendar event with data:', googleEventData);
                  const googleEvent = await createGoogleCalendarEvent(googleEventData);
                  console.log('Google Calendar event created:', googleEvent);

                  await prisma.event.update({
                    where: { id: newEvent.id },
                    data: { googleEventId: googleEvent.id },
                  });
                  console.log('Database updated with Google Event ID:', googleEvent.id);
                } catch (googleError) {
                  console.error('Failed to create Google Calendar event:', googleError);
                  // Continue without Google Calendar integration
                }

                await replyToUser(replyToken, `✅ 完了！行事「${newEvent.eventName}」が作成されました😃`);
              }
            }
            else {
              console.log('Creating new regular event...');
              // Logic for other events
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
              console.log('New regular event created in database:', newEvent);

              try {
                const googleEventData = {
                  title: newEvent.eventName,
                  description: `導師: ${newEvent.doushi}\n音響: ${newEvent.onkyo}\n常駐: ${newEvent.shikai}\n\nコメント: ${newEvent.comment}`,
                  start: newEvent.startTime,
                  end: newEvent.endTime,
                  allDay: false,
                };
                console.log('Creating Google Calendar event with data:', googleEventData);
                const googleEvent = await createGoogleCalendarEvent(googleEventData);
                console.log('Google Calendar event created:', googleEvent);

                await prisma.event.update({
                  where: { id: newEvent.id },
                  data: { googleEventId: googleEvent.id },
                });
                console.log('Database updated with Google Event ID:', googleEvent.id);
              } catch (googleError) {
                console.error('Failed to create Google Calendar event:', googleError);
                // Continue without Google Calendar integration
              }

              await replyToUser(replyToken, `✅ 完了！行事「${newEvent.eventName}」が作成されました😃`);
            }
          } catch (error) {
            console.error('Failed to create/update event:', error);
            console.error('Error stack:', error.stack);
            await replyToUser(replyToken, `申し訳ございません。処理中にエラーが発生しました：${error.message}`);
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

      // Handle year selection (custom date flow)
      if (state.step === 'select_year') {
        const yearNum = parseInt(userText, 10);
        if (yearNum === 1 || yearNum === 2) {
          const selectedYear = yearNum === 1 ? 2025 : 2026;
          state.data.selectedYear = selectedYear;
          state.step = 'select_month';
          conversationState[userId] = state;
          
          const months = [
            '1月', '2月', '3月', '4月', '5月', '6月',
            '7月', '8月', '9月', '10月', '11月', '12月'
          ];
          const monthList = months.map((m, i) => `${i + 1}) ${m}`).join('\n');
          await replyToUser(replyToken, `月を選択してください：\n${monthList}`);
        } else {
          await replyToUser(replyToken, '1または2で返信してください。');
        }
        continue;
      }

      // Handle month selection (custom date flow)
      if (state.step === 'select_month') {
        const monthNum = parseInt(userText, 10);
        if (monthNum >= 1 && monthNum <= 12) {
          state.data.selectedMonth = monthNum;
          state.step = 'select_day';
          conversationState[userId] = state;
          
          // Generate days for the selected month/year
          const year = state.data.selectedYear;
          const month = monthNum;
          const daysInMonth = new Date(year, month, 0).getDate();
          const dayList = Array.from({length: daysInMonth}, (_, i) => `${i + 1}) ${i + 1}日`).join('\n');
          
          await replyToUser(replyToken, `日を選択してください：\n${dayList}`);
        } else {
          await replyToUser(replyToken, '1から12までの番号で返信してください。');
        }
        continue;
      }

      // Handle day selection (custom date flow)
      if (state.step === 'select_day') {
        const dayNum = parseInt(userText, 10);
        const year = state.data.selectedYear;
        const month = state.data.selectedMonth;
        const daysInMonth = new Date(year, month, 0).getDate();
        
        if (dayNum >= 1 && dayNum <= daysInMonth) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          state.data.date = dateStr;
          
          // Generate start times
          const startTimes = [];
          for (let hour = 8; hour < 22; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
              const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
              startTimes.push(timeStr);
            }
          }
          
          state.options = { startTimes };
          state.step = 'select_start_time';
          conversationState[userId] = state;
          
          const timesText = startTimes.map((t, i) => `${i + 1}) ${t}`).join('\n');
          await replyToUser(replyToken, `${dateStr}の開始時刻を番号で選択してください：\n${timesText}`);
        } else {
          await replyToUser(replyToken, `1から${daysInMonth}までの番号で返信してください。`);
        }
        continue;
      }

      // If no matching flow, prompt user quickly
      await replyToUser(replyToken, `ご希望の操作を番号で選んでください：\n1) 行事入力\n2) リマインダ登録`);
    }
  }

  res.status(200).json({ success: true });
}