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

function parseDate(dateString) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  dateString = dateString.toLowerCase();

  if (dateString === 'today' || dateString === '今日') {
    return today;
  }
  if (dateString === 'tomorrow' || dateString === '明日') {
    return tomorrow;
  }

  const weekdays = {
    'sunday': 0, '日曜日': 0,
    'monday': 1, '月曜日': 1,
    'tuesday': 2, '火曜日': 2,
    'wednesday': 3, '水曜日': 3,
    'thursday': 4, '木曜日': 4,
    'friday': 5, '金曜日': 5,
    'saturday': 6, '土曜日': 6,
  };

  for (const day in weekdays) {
    if (dateString.includes(day)) {
      let targetDay = weekdays[day];
      let resultDate = new Date();
      resultDate.setDate(today.getDate() + (targetDay - today.getDay() + 7) % 7);
      if (dateString.startsWith('next') || dateString.startsWith('来週')) {
        resultDate.setDate(resultDate.getDate() + 7);
      }
      return resultDate;
    }
  }

  const parsedDate = new Date(dateString);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  return null;
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

      let state = conversationState[userId] || { step: 'idle' };

      if (userText.toLowerCase() === 'cancel' || userText === 'キャンセル') {
        delete conversationState[userId];
        await replyToUser(replyToken, '行事作成をキャンセルしました。');
        continue;
      }

      // Start: show selections from settings data
      if (state.step === 'idle' && (userText.toLowerCase() === 'new event' || userText === '新規行事')) {
        // Fetch settings items from DB
        try {
          const settingsItems = await prisma.settingsItem.findMany({
            orderBy: { createdAt: 'desc' },
          });

          // Group settings by type
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
            // Fallback to original free-form flow if no preset events
            state = { step: 'awaiting_name', data: {} };
            conversationState[userId] = state;
            await replyToUser(replyToken, 'プリセット行事が見つかりません。行事名を入力してください。');
            continue;
          }

          // Save settings for later use
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

          // Build date-only list from today -> one month ahead (so reply is compact)
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

          // keep template for time slots (09:00 - 20:00, 30-min)
          state.options.dateOptions = dateOptions;
          state.options.timeTemplate = { startHour: 9, endHour: 20, stepMinutes: 30 };
          // stage: user first selects a date, then a timeslot
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
          // start structured date selection: year -> month -> day
          state.step = 'select_year';
          // set baseDate = one month ahead so UI shows options starting from next month
          const base = new Date();
          base.setMonth(base.getMonth() + 1);
          state.meta = state.meta || {};
          state.meta.baseDate = {
            year: base.getFullYear(),
            month: base.getMonth() + 1, // 1-based
            day: base.getDate(),
          };
          conversationState[userId] = state;
          await replyToUser(replyToken, `年を選択してください：\n1) ${state.meta.baseDate.year}\n2) ${state.meta.baseDate.year + 1}\n番号で返信してください。`);
          continue;
        }
        // Two-stage within select_datetime: first date selection, then time selection
        const num = parseInt(userText, 10);
        if (!Number.isInteger(num)) {
          await replyToUser(replyToken, '日付または時刻の番号で返信するか、「カスタム」と入力してください。');
          continue;
        }

        if (state.meta && state.meta.datetimeStage === 'date') {
          const dateIdx = num - 1;
          if (!state.options || !state.options.dateOptions || dateIdx < 0 || dateIdx >= state.options.dateOptions.length) {
            await replyToUser(replyToken, `Invalid selection. Reply with a number between 1 and ${state.options && state.options.dateOptions ? state.options.dateOptions.length : 31}.`);
            continue;
          }
          const chosenDate = state.options.dateOptions[dateIdx];
          // build timeslots for that single date
          const tpl = state.options.timeTemplate || { startHour: 9, endHour: 20, stepMinutes: 30 };
          const slots = [];
          for (let minutes = tpl.startHour * 60; minutes < tpl.endHour * 60; minutes += tpl.stepMinutes) {
            const sh = Math.floor(minutes / 60);
            const sm = minutes % 60;
            const eh = Math.floor((minutes + tpl.stepMinutes) / 60);
            const em = (minutes + tpl.stepMinutes) % 60;

            // Construct date strings in JST by appending the timezone offset
            const startTimeStrJST = `${chosenDate}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00+09:00`;
            const endTimeStrJST = `${chosenDate}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00+09:00`;

            // Create Date objects from the JST strings and then convert to ISO strings (which are always UTC)
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

        // stage === 'time' => pick timeslot index
        const timeIdx = num - 1;
        if (!state.options || !state.options.timeSlots || timeIdx < 0 || timeIdx >= state.options.timeSlots.length) {
          await replyToUser(replyToken, `無効な選択です。1から${state.options && state.options.timeSlots ? state.options.timeSlots.length : 22}までの番号で返信してください。`);
          continue;
        }
        const chosen = state.options.timeSlots[timeIdx];
        state.data.date = chosen.date;
        state.data.startTime = chosen.startTime;
        state.data.endTime = chosen.endTime;
        // proceed to role selection
        state.step = 'select_role';
        state.meta = { rolesOrder: ['doushi', 'onkyo', 'shikai'], roleIndex: 0 };
        // prepare role options from settings
        const roleOptions = {
          doushi: state.options.doushis || [],
          onkyo: state.options.onkyos || [],
          shikai: state.options.shikais || [],
        };
        state.options.roles = roleOptions;
        conversationState[userId] = state;

        const currentRole = state.meta.rolesOrder[state.meta.roleIndex];
        const opts = (state.options.roles[currentRole] || []);
        // Add "1) なし" as the first option. The rest of the names start from 2.
        const list = `1) なし\n` + (opts.length ? opts.map((o, i) => `${i + 2}) ${o}`).join('\n') : '(プリセット名なし)');

        // Map role names to Japanese
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
        // Check if the user input is a number
        if (Number.isInteger(num)) {
          if (num === 1) {
            // User selected "1) なし"
            state.data[currentRole] = 'N/A';
          } else {
            // User selected a name from the list (which starts at index 2)
            const opts = state.options.roles[currentRole] || [];
            const selectedName = opts[num - 2]; // Adjust index
            if (selectedName) {
              state.data[currentRole] = selectedName;
            } else {
              // The number was out of range
              await replyToUser(replyToken, `無効な番号です。リストから選択してください。`);
              continue; // Stay in the same step
            }
          }
        } else {
          // If not a number, treat it as a directly typed name
          state.data[currentRole] = userText;
        }

        idx += 1;
        if (idx >= rolesOrder.length) {
          // done with roles, ask comment
          state.step = 'awaiting_comment';
          conversationState[userId] = state;
          await replyToUser(replyToken, '役割が設定されました。コメントはありますか？\n1) なし\nコメント内容を直接入力することもできます。');
          continue;
        } else {
          // ask next role
          state.meta.roleIndex = idx;
          conversationState[userId] = state;
          const nextRole = rolesOrder[idx];
          const nextOpts = (state.options.roles[nextRole] || []);
          // Add "1) なし" as the first option for the next role as well.
          const list = `1) なし\n` + (nextOpts.length ? nextOpts.map((o, i) => `${i + 2}) ${o}`).join('\n') : '(プリセット名なし)');

          // Map role names to Japanese
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
        // switch to structured date selection
        state.step = 'select_year';
        conversationState[userId] = state;
        await replyToUser(replyToken, `了解しました。"${userText}"の年を選択してください：\n1) 2025\n2) 2026\n番号で返信してください。`);
        continue;
      } else if (state.step === 'awaiting_date') {
        // legacy branch preserved but not used; keep for safety
        await replyToUser(replyToken, '提供された選択フローを使用してください（年→月→日の順で選択）。');
        continue;
      } else if (state.step === 'awaiting_roles') {
        // legacy path — keep for compatibility but prefer select_role flow
        const roles = userText.split(',').map(p => p.trim());
        state.data.doushi = 'N/A';
        state.data.onkyo = 'N/A';
        state.data.shikai = 'N/A';
        roles.forEach(role => {
          const [roleName, personName] = role.split(':').map(s => s.trim());
          if (roleName && personName) {
            if (roleName.toLowerCase() === 'doushi' || roleName === '導師') state.data.doushi = personName;
            if (roleName.toLowerCase() === 'onkyo' || roleName === '音響') state.data.onkyo = personName;
            if (roleName.toLowerCase() === 'shikai' || roleName === '司会') state.data.shikai = personName;
          }
        });
        state.step = 'awaiting_comment';
        conversationState[userId] = state;
        await replyToUser(replyToken, '役割が割り当てられました。コメントはありますか？（コメントがない場合は「なし」と入力してください）');
        continue;
      } else if (state.step === 'awaiting_comment') {
        // Handle "1" or "なし" for no comment, otherwise use the text.
        if (userText === '1' || userText.toLowerCase() === 'none' || userText === 'なし') {
          state.data.comment = '';
        } else {
          state.data.comment = userText;
        }
        conversationState[userId] = state;

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
        continue;
      }

      // If no matching flow, prompt user quickly
      await replyToUser(replyToken, '新しい行事を作成するには「new event」または「新規行事」と入力してください。キャンセルするには「cancel」と入力してください。');
    }
  }

  res.status(200).json({ success: true });
}