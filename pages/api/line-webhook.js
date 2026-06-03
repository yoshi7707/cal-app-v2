import prisma from '../../lib/prisma';
import { createGoogleCalendarEvent, updateGoogleCalendarEvent } from '../../lib/googleCalendar';
import { appendToSheet } from '../../lib/googleSheet'; // <-- IMPORT THE NEW HELPER
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
  // ... existing handleRoleRegistration code ...
  // (This function remains unchanged)
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
        await prisma.settingsItem.upsert({
          where: { type_name: { type: state.data.role, name: state.data.name } },
          update: { lineId: userId },
          create: { type: state.data.role, name: state.data.name, lineId: userId },
        });
        await replyToUser(replyToken, `✅ 登録が完了しました。\n種類: ${state.data.roleLabel}\n名前: ${state.data.name}`);
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

  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const rawBody = await buffer(req);
  const signature = req.headers['x-line-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing signature' });
  const expectedSignature = crypto.createHmac('sha256', channelSecret).update(rawBody).digest('base64');
  if (signature !== expectedSignature) return res.status(401).json({ error: 'Invalid signature' });

  const webhookBody = JSON.parse(rawBody.toString());

  for (const event of webhookBody.events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userId = event.source.userId;
      const userText = event.message.text.trim();
      const replyToken = event.replyToken;
      let state = conversationState[userId] || { step: 'idle' };

      // --- Entry points for different flows ---

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

      // NEW: Entry point for "集計"
      if (userText === '集計') {
        state.step = 'shukei_start';
        conversationState[userId] = state;
        // The first question will be asked by the handler
        const handled = await handleShukeiFlow(userId, userText, replyToken, state);
        if (handled) continue;
      }

      // --- Delegate to handlers ---

      let handled = await handleRoleRegistration(userId, userText, replyToken, state);
      if (handled) continue;

      // NEW: Delegate to shukei handler
      handled = await handleShukeiFlow(userId, userText, replyToken, state);
      if (handled) continue;

      // --- fallback ---
      await replyToUser(replyToken, `「登録」または「集計」と入力してください。`);
    }
  }

  res.status(200).json({ success: true });
}

// import { NextRequest, NextResponse } from 'next/server';
// import prisma from '../../lib/prisma';
// import { createGoogleCalendarEvent, updateGoogleCalendarEvent } from '../../lib/googleCalendar';
// import { appendToSheet } from '../../lib/googleSheet';
// import crypto from 'crypto';

// const conversationState: Record<string, any> = {};

// const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
// const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
// const LINE_API_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

// // In-memory session storage (use Redis in production)
// const userSessions = new Map<string, {
//   step: 'awaiting_area' | 'awaiting_question' | 'awaiting_confirmation';
//   currentQuestion: number;
//   area?: string;
//   reportId?: string;
// }>();

// // Question list
// const questions = [
//   '❶12月伝道着地見込み　三帰者人数',
//   '❷12月伝道着地見込み　入会者人数',
//   '❸ふれ愛活動(11/27〜12/17の期間)',
//   '❹ふれ愛活動筋親数',
//   '❺月一程度、支部に来る信者数',
//   '❻まだ定期的には支部に来ない信者数',
//   '❼再訪可能で、今月ふれ愛できた一般人数',
//   '❽新規開拓でふれ愛できた一般人数',
// ];

// const TOTAL_QUESTIONS = questions.length;

// // --- Utility functions ---
// function normalizeNumber(text: string): string {
//   const fullWidthToHalfWidth: { [key: string]: string } = {
//     '１': '1', '２': '2', '３': '3', '４': '4', '５': '5',
//     '６': '6', '７': '7', '８': '8', '９': '9', '０': '0'
//   };
  
//   let normalized = text;
//   for (const [fw, hw] of Object.entries(fullWidthToHalfWidth)) {
//     normalized = normalized.replace(new RegExp(fw, 'g'), hw);
//   }
//   return normalized;
// }

// function verifySignature(body: string, signature: string): boolean {
//   if (!CHANNEL_SECRET) return true;
  
//   const hash = crypto
//     .createHmac('sha256', CHANNEL_SECRET)
//     .update(body)
//     .digest('base64');
  
//   return hash === signature;
// }

// async function replyMessage(replyToken: string, messages: any[]) {
//   if (!CHANNEL_ACCESS_TOKEN) {
//     console.error('Missing LINE_CHANNEL_ACCESS_TOKEN');
//     return;
//   }

//   const response = await fetch(LINE_API_REPLY_URL, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
//     },
//     body: JSON.stringify({
//       replyToken,
//       messages,
//     }),
//   });

//   if (!response.ok) {
//     throw new Error(`LINE API error: ${response.status}`);
//   }

//   return response.json();
// }

// // --- Role registration flow handler ---
// async function handleRoleRegistration(userId: string, userText: string, replyToken: string, state: any): Promise<boolean> {
//   const normalizedText = normalizeNumber(userText);
//   const cleanText = normalizedText.replace(/[^\d]/g, '');

//   // Step: choose role
//   if (state.step === 'register_entry') {
//     const num = parseInt(cleanText, 10);

//     if (num === 4) {
//       delete conversationState[userId];
//       await replyMessage(replyToken, [{ type: 'text', text: 'キャンセルしました。' }]);
//       return true;
//     }

//     if (!Number.isInteger(num) || ![1, 2, 3].includes(num)) {
//       await replyMessage(replyToken, [{ type: 'text', text: '無効な選択です。1〜4の番号で選んでください。' }]);
//       return true;
//     }

//     let role = '', roleLabel = '';
//     switch (num) {
//       case 1: role = 'doushi'; roleLabel = '導師'; break;
//       case 2: role = 'onkyo'; roleLabel = '音響'; break;
//       case 3: role = 'shikai'; roleLabel = '常駐'; break;
//     }

//     try {
//       const settingsItems = await prisma.settingsItem.findMany({
//         where: { type: role },
//         orderBy: { createdAt: 'desc' },
//       });
//       const names = settingsItems.map(i => i.name);
//       if (!names || names.length === 0) {
//         await replyMessage(replyToken, [{ type: 'text', text: `${roleLabel}がまだ登録されていません。` }]);
//         delete conversationState[userId];
//         return true;
//       }
//       state.step = 'select_reminder_role_name';
//       state.data = { role, roleLabel };
//       state.options = { names };
//       conversationState[userId] = state;
//       const listText = names.map((n, i) => `${i + 1}) ${n}`).join('\n');
//       await replyMessage(replyToken, [{ type: 'text', text: `${roleLabel}を番号で選んでください：\n${listText}` }]);
//     } catch (err) {
//       console.error('DB error when fetching role list:', err);
//       await replyMessage(replyToken, [{ type: 'text', text: `${roleLabel}一覧の取得に失敗しました。` }]);
//       delete conversationState[userId];
//     }
//     return true;
//   }

//   // Step: choose name
//   if (state.step === 'select_reminder_role_name') {
//     const idx = parseInt(cleanText, 10) - 1;

//     if (!Number.isInteger(idx) || !state.options?.names || idx < 0 || idx >= state.options.names.length) {
//       await replyMessage(replyToken, [{ type: 'text', text: `無効な選択です。1〜${state.options?.names.length}の番号で返信してください。` }]);
//       return true;
//     }

//     const chosenName = state.options.names[idx];
//     state.data.name = chosenName;
//     state.step = 'confirm_reminder_role';
//     conversationState[userId] = state;
//     await replyMessage(replyToken, [{
//       type: 'text',
//       text: `以下で登録していいですか？\n種類: ${state.data.roleLabel}\n名前: ${chosenName}\n\n1) はい\n2) いいえ`
//     }]);
//     return true;
//   }

//   // Step: confirm registration
//   if (state.step === 'confirm_reminder_role') {
//     const choice = parseInt(cleanText, 10);

//     if (choice === 1) {
//       try {
//         await prisma.settingsItem.upsert({
//           where: { type_name: { type: state.data.role, name: state.data.name } },
//           update: { lineId: userId },
//           create: { type: state.data.role, name: state.data.name, lineId: userId },
//         });
//         await replyMessage(replyToken, [{ type: 'text', text: `✅ 登録が完了しました。\n種類: ${state.data.roleLabel}\n名前: ${state.data.name}` }]);
//       } catch (err) {
//         console.error('DB error during role registration:', err);
//         await replyMessage(replyToken, [{ type: 'text', text: '⚠️ データベースへの登録中にエラーが発生しました。' }]);
//       } finally {
//         delete conversationState[userId];
//       }
//     } else if (choice === 2) {
//       delete conversationState[userId];
//       await replyMessage(replyToken, [{ type: 'text', text: 'キャンセルしました。' }]);
//     } else {
//       await replyMessage(replyToken, [{ type: 'text', text: '1か2で答えてください。' }]);
//     }
//     return true;
//   }

//   return false;
// }

// // --- Main webhook handler ---
// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.text();
//     const signature = request.headers.get('x-line-signature') || '';

//     if (!verifySignature(body, signature)) {
//       return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
//     }

//     const data = JSON.parse(body);
    
//     for (const event of data.events) {
//       if (event.type !== 'message' || event.message.type !== 'text') {
//         continue;
//       }

//       const userId = event.source.userId;
//       const userMessage = event.message.text.trim();
//       const replyToken = event.replyToken;
//       const session = userSessions.get(userId);
//       let state = conversationState[userId] || { step: 'idle' };

//       // --- Handle "集計" (Tally/Summary) ---
//       if (userMessage === '集計') {
//         try {
//           const threeDaysAgo = new Date();
//           threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          
//           const reports = await prisma.report.findMany({
//             where: {
//               createdAt: {
//                 gte: threeDaysAgo,
//               },
//             },
//           });
          
//           const areas = ['せんげん台', '北越', '門前', '新越', '吉松', '三郷'];
          
//           const areaData: { [key: string]: number[] } = {};
//           areas.forEach(area => {
//             areaData[area] = Array(20).fill(0);
//           });
          
//           reports.forEach((report: any) => {
//             if (areaData[report.area]) {
//               for (let i = 1; i <= 20; i++) {
//                 const value = report[`Q${i}`] as number;
//                 areaData[report.area][i - 1] += value || 0;
//               }
//             }
//           });
          
//           const totals = Array(20).fill(0);
//           Object.values(areaData).forEach(areaValues => {
//             areaValues.forEach((value, index) => {
//               totals[index] += value;
//             });
//           });
          
//           const messages = [];
          
//           messages.push({
//             type: 'text',
//             text: `【集計結果】\n過去3日間のデータのみを使用しています。\n（${reports.length}件の報告）\n`,
//           });
          
//           for (let block = 0; block < 4; block++) {
//             const startQ = block * 5 + 1;
//             const endQ = startQ + 4;
            
//             let message = `地区　　　　　Q${startQ} / Q${startQ+1} / Q${startQ+2} / Q${startQ+3} / Q${startQ+4}\n`;
            
//             areas.forEach(area => {
//               const values = areaData[area].slice(startQ - 1, endQ);
//               message += `${area.padEnd(10, '　')}${values.join(' / ')}\n`;
//             });
            
//             const totalValues = totals.slice(startQ - 1, endQ);
//             message += `合計　　　　　${totalValues.join(' / ')}`;
            
//             messages.push({
//               type: 'text',
//               text: message,
//             });
//           }
          
//           await replyMessage(replyToken, messages);
//           continue;
//         } catch (error) {
//           console.error('Failed to generate matrix:', error);
//           await replyMessage(replyToken, [{
//             type: 'text',
//             text: '集計の取得に失敗しました。',
//           }]);
//           continue;
//         }
//       }

//       // --- Handle "報告" (Report) flow ---
//       if (userMessage === '報告') {
//         userSessions.set(userId, { 
//           step: 'awaiting_area',
//           currentQuestion: 0
//         });
        
//         await replyMessage(replyToken, [{
//           type: 'text',
//           text: '七の日報告ですね。あなたの地区を選んでください。\n1. せんげん台\n2. 北越\n3. 門前\n4. 新越\n5. 吉松\n6. 三郷',
//         }]);
//         continue;
//       }
      
//       if (session?.step === 'awaiting_area') {
//         const normalizedMessage = normalizeNumber(userMessage);
        
//         if (!['1', '2', '3', '4', '5', '6'].includes(normalizedMessage)) {
//           await replyMessage(replyToken, [{
//             type: 'text',
//             text: '無効な選択です。1〜6の番号で選んでください。',
//           }]);
//           continue;
//         }
        
//         const districts = ['せんげん台', '北越', '門前', '新越', '吉松', '三郷'];
//         const selectedDistrict = districts[parseInt(normalizedMessage, 10) - 1];
        
//         const report = await prisma.report.create({
//           data: {
//             area: selectedDistrict,
//           },
//         });
        
//         userSessions.set(userId, {
//           step: 'awaiting_question',
//           currentQuestion: 1,
//           area: selectedDistrict,
//           reportId: report.id,
//         });
        
//         await replyMessage(replyToken, [{
//           type: 'text',
//           text: `${selectedDistrict}ですね。\n${questions[0]}`,
//         }]);
//         continue;
//       }
      
//       if (session?.step === 'awaiting_question') {
//         const questionNumber = session.currentQuestion;
//         const fieldName = `Q${questionNumber}`;
        
//         const normalizedMessage = normalizeNumber(userMessage);
        
//         if (!/^\d+$/.test(normalizedMessage)) {
//           await replyMessage(replyToken, [{
//             type: 'text',
//             text: '数字を入力してください。',
//           }]);
//           continue;
//         }
        
//         const answerNumber = parseInt(normalizedMessage, 10);
        
//         await prisma.report.update({
//           where: { id: session.reportId },
//           data: { [fieldName]: answerNumber },
//         });
        
//         if (questionNumber < TOTAL_QUESTIONS) {
//           userSessions.set(userId, {
//             ...session,
//             currentQuestion: questionNumber + 1,
//           });
          
//           await replyMessage(replyToken, [{
//             type: 'text',
//             text: questions[questionNumber],
//           }]);
//         } else {
//           const report = await prisma.report.findUnique({
//             where: { id: session.reportId },
//           });
          
//           if (!report) {
//             throw new Error('Report not found');
//           }
          
//           let summary = `【入力内容の確認】\n\n地区: ${report.area}\n`;
//           for (let i = 1; i <= 20; i++) {
//             const answer = (report as any)[`Q${i}`];
//             summary += `Q${i}: ${answer}\n`;
//           }
//           summary += '\nこれで登録して良いですか？\n1. はい\n2. いいえ';
          
//           userSessions.set(userId, {
//             ...session,
//             step: 'awaiting_confirmation',
//           });
          
//           await replyMessage(replyToken, [{
//             type: 'text',
//             text: summary,
//           }]);
//         }
//         continue;
//       }
      
//       if (session?.step === 'awaiting_confirmation') {
//         const normalizedMessage = normalizeNumber(userMessage);
        
//         if (normalizedMessage === '1') {
//           userSessions.delete(userId);
          
//           await replyMessage(replyToken, [{
//             type: 'text',
//             text: '報告を保存しました。ありがとうございました！',
//           }]);
//         } else if (normalizedMessage === '2') {
//           await prisma.report.delete({
//             where: { id: session.reportId },
//           });
          
//           userSessions.delete(userId);
          
//           await replyMessage(replyToken, [{
//             type: 'text',
//             text: '登録をキャンセルしました。最初からやり直す場合は「報告」と入力してください。',
//           }]);
//         } else {
//           await replyMessage(replyToken, [{
//             type: 'text',
//             text: '1 または 2 を入力してください。\n1. はい\n2. いいえ',
//           }]);
//         }
//         continue;
//       }

//       // --- Handle "登録" (Registration) flow ---
//       if (userMessage === '登録') {
//         state.step = 'register_entry';
//         conversationState[userId] = state;
//         await replyMessage(replyToken, [{
//           type: 'text',
//           text: `リマインダ登録を行いますか？\n1) 導師\n2) 音響\n3) 常駐\n4) いいえ`
//         }]);
//         continue;
//       }

//       const handled = await handleRoleRegistration(userId, userMessage, replyToken, state);
//       if (handled) continue;

//       // --- Fallback ---
//       await replyMessage(replyToken, [{
//         type: 'text',
//         text: `「登録」または「報告」または「集計」と入力してください。`
//       }]);
//     }

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error('Webhook error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// export async function GET() {
//   return NextResponse.json({ status: 'LINE webhook endpoint is running' });
// }