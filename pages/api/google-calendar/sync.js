import { fetchGoogleCalendarEvents, createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from '../../../lib/googleCalendar';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      let { timeMin, timeMax } = req.query;
      
      // If timeMin and timeMax are not provided, default to current month and next month
      if (!timeMin || !timeMax) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        // Start of current month
        const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
        
        // End of next month
        const endOfNextMonth = new Date(currentYear, currentMonth + 2, 0, 23, 59, 59, 999);
        
        timeMin = startOfCurrentMonth.toISOString();
        timeMax = endOfNextMonth.toISOString();
        
        console.log(`Fetching Google Calendar events from ${timeMin} to ${timeMax}`);
      }
      
      const events = await fetchGoogleCalendarEvents('primary', timeMin, timeMax);
      res.status(200).json({ events });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const event = await createGoogleCalendarEvent(req.body);
      res.status(201).json({ event });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'PUT') {
    try {
      const { eventId, ...eventData } = req.body;
      const event = await updateGoogleCalendarEvent(eventId, eventData);
      res.status(200).json({ event });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { eventId } = req.query;
      await deleteGoogleCalendarEvent(eventId);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}