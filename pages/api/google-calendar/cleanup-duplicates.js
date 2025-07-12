import { fetchGoogleCalendarEvents, deleteGoogleCalendarEvent } from '../../../lib/googleCalendar';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      console.log('Starting cleanup of duplicate events in Google Calendar...');
      
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      // Get all events from Google Calendar for the next 3 months
      const now = new Date();
      const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      
      const googleEvents = await fetchGoogleCalendarEvents(
        calendarId,
        now.toISOString(),
        threeMonthsFromNow.toISOString()
      );
      
      console.log(`Found ${googleEvents.length} events in Google Calendar`);
      
      const results = {
        duplicatesFound: 0,
        duplicatesRemoved: 0,
        errors: 0,
        details: []
      };
      
      // Group events by title and time to find duplicates
      const eventGroups = {};
      
      googleEvents.forEach(event => {
        const key = `${event.title}_${event.start}_${event.end}`;
        if (!eventGroups[key]) {
          eventGroups[key] = [];
        }
        eventGroups[key].push(event);
      });
      
      // Find and remove duplicates
      for (const [key, events] of Object.entries(eventGroups)) {
        if (events.length > 1) {
          console.log(`Found ${events.length} duplicate events for: ${events[0].title}`);
          results.duplicatesFound += events.length - 1;
          
          // Keep the first event, remove the rest
          const eventsToRemove = events.slice(1);
          
          for (const eventToRemove of eventsToRemove) {
            try {
              await deleteGoogleCalendarEvent(eventToRemove.id, calendarId);
              results.duplicatesRemoved++;
              results.details.push({
                eventId: eventToRemove.id,
                title: eventToRemove.title,
                status: 'removed'
              });
              console.log(`Removed duplicate event: ${eventToRemove.id}`);
            } catch (error) {
              console.error('Error removing duplicate event:', error);
              results.errors++;
              results.details.push({
                eventId: eventToRemove.id,
                title: eventToRemove.title,
                status: 'error',
                error: error.message
              });
            }
          }
        }
      }
      
      console.log('Cleanup completed:', results);
      res.status(200).json({
        success: true,
        message: `Cleanup completed: ${results.duplicatesFound} duplicates found, ${results.duplicatesRemoved} removed, ${results.errors} errors`,
        results
      });
      
    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 