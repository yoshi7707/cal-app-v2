// pages/api/cron/send-line-reminders
// Sends LINE reminders to the person in charge for events happening tomorrow

import prisma from '../../../lib/prisma'

const LINE_API_PUSH_URL = 'https://api.line.me/v2/bot/message/push'

// Map of role/person name to LINE user ID.
// Prefer managing this via env as JSON: LINE_USER_ID_MAP_JSON='{"支部長":"Uxxxxxxxx"}'
function getLineUserIdMap() {
  try {
    if (process.env.LINE_USER_ID_MAP_JSON) {
      return JSON.parse(process.env.LINE_USER_ID_MAP_JSON)
    }
  } catch (e) {
    console.error('Invalid LINE_USER_ID_MAP_JSON:', e)
  }
  // Fallback sample mapping; replace with real IDs
  return {
    "田口義明": "U2ae6a5bc435866bd08148d3d7df3d2e8",
    "支部長": "U2ae6a5bc435866bd08148d3d7df3d2e8"
  }
}

async function sendLineMessage(userId, message) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    console.error('Missing LINE_CHANNEL_ACCESS_TOKEN')
    return
  }
  const res = await fetch(LINE_API_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text: message }]
    })
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('LINE push error', res.status, text)
  }
}

function getDayRange(targetDateString) {
  // If targetDateString provided, compute that day's [00:00, 24:00); else use tomorrow.
  let day = new Date()
  if (targetDateString) {
    const parsed = new Date(targetDateString)
    if (!isNaN(parsed.getTime())) {
      day = parsed
    }
  } else {
    day.setDate(day.getDate() + 1)
  }
  day.setHours(0, 0, 0, 0)

  const nextDay = new Date(day)
  nextDay.setDate(nextDay.getDate() + 1)
  nextDay.setHours(0, 0, 0, 0)

  return { start: day, end: nextDay }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const dryRun = req.query?.dry === '1' || req.query?.dry === 'true'
    const dateParam = typeof req.query?.date === 'string' ? req.query.date : undefined
    const { start, end } = getDayRange(dateParam)
    const events = await prisma.event.findMany({
      where: {
        startTime: {
          gte: start.toISOString(),
          lt: end.toISOString()
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
    })

    const lineUserIdMap = getLineUserIdMap()
    let pushCount = 0

    for (const e of events) {
      const title = e.eventName
      const rolesByPerson = {}

      const potentialRoles = {
        doushi: '導師',
        onkyo: '音響',
        shikai: '司会',
      }

      for (const roleKey in potentialRoles) {
        const personName = e[roleKey]
        if (personName) {
          if (!rolesByPerson[personName]) {
            rolesByPerson[personName] = []
          }
          rolesByPerson[personName].push(potentialRoles[roleKey])
        }
      }

      // Send one message per person
      for (const personName in rolesByPerson) {
        if (lineUserIdMap[personName]) {
          const rolesText = rolesByPerson[personName].join('、')
          const eventTime = new Date(e.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
          const message = `【リマインダー】明日${eventTime}～「${title}」の${rolesText}担当です。`
          if (dryRun) {
            pushCount += 1
          } else {
            await sendLineMessage(lineUserIdMap[personName], message)
            pushCount += 1
          }
        }
      }
    }

    return res.status(200).json({ ok: true, eventsChecked: events.length, messagesSent: pushCount, dryRun })
  } catch (error) {
    console.error('send-line-reminders error:', error)
    return res.status(500).json({ ok: false, error: error.message })
  }
}


