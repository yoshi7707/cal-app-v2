// sendLineReminder.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

// Import Prisma client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Map of person in charge to LINE user ID
const lineUserIdMap = {
  '支部長': 'U2ae6a5bc435866bd08148d3d7df3d2e8', // Replace with real LINE user ID
  // Add more mappings as needed
};

// 2. Function to get events from database
async function getEventsFromDatabase() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    dayAfterTomorrow.setHours(23, 59, 59, 999);

    const events = await prisma.event.findMany({
      where: {
        startTime: {
          gte: tomorrow.toISOString(),
          lte: dayAfterTomorrow.toISOString()
        }
      },
      select: {
        id: true,
        eventName: true,
        startTime: true,
        endTime: true,
        doushi: true,
        onkyo: true,
        shikai: true,
        uketsuke: true,
        comment: true
      }
    });

    return events.map(event => ({
      id: event.id,
      title: event.eventName,
      start: new Date(event.startTime),
      end: new Date(event.endTime),
      doushi: event.doushi,
      onkyo: event.onkyo,
      shikai: event.shikai,
      uketsuke: event.uketsuke,
      comment: event.comment
    }));
  } catch (error) {
    console.error('Error fetching events from database:', error);
    return [];
  }
}

// 3. Function to send a LINE message
async function sendLineMessage(userId, message) {
  const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text: message }]
    })
  });
}

// 4. Find events for tomorrow and send reminders
async function sendReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Get real events from database
  const events = await getEventsFromDatabase();
  console.log(`Found ${events.length} events for tomorrow`);

  for (const event of events) {
    const eventDate = new Date(event.start);
    if (
      eventDate.getFullYear() === tomorrow.getFullYear() &&
      eventDate.getMonth() === tomorrow.getMonth() &&
      eventDate.getDate() === tomorrow.getDate()
    ) {
      // Send reminder to doushi (導師)
      const doushiUserId = lineUserIdMap[event.doushi];
      if (doushiUserId) {
        const message = `【リマインダー】明日「${event.title}」の導師担当です。`;
        await sendLineMessage(doushiUserId, message);
        console.log(`Sent reminder to 導師 ${event.doushi} for event "${event.title}"`);
      }

      // Send reminder to onkyo (音響) if different from doushi
      if (event.onkyo && event.onkyo !== event.doushi) {
        const onkyoUserId = lineUserIdMap[event.onkyo];
        if (onkyoUserId) {
          const message = `【リマインダー】明日「${event.title}」の音響担当です。`;
          await sendLineMessage(onkyoUserId, message);
          console.log(`Sent reminder to 音響 ${event.onkyo} for event "${event.title}"`);
        }
      }

      // Send reminder to shikai (司会) if different from doushi and onkyo
      if (event.shikai && event.shikai !== event.doushi && event.shikai !== event.onkyo) {
        const shikaiUserId = lineUserIdMap[event.shikai];
        if (shikaiUserId) {
          const message = `【リマインダー】明日「${event.title}」の司会担当です。`;
          await sendLineMessage(shikaiUserId, message);
          console.log(`Sent reminder to 司会 ${event.shikai} for event "${event.title}"`);
        }
      }
    }
  }
}

// Run the reminder function
async function main() {
  try {
    await sendReminders();
  } catch (error) {
    console.error('Error in main function:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();