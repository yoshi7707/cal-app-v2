import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent, findExistingGoogleEvent } from '../../../lib/googleCalendar';
import { getCurrentAndNextMonthEvents, setGoogleEventId } from '../../../prisma/event';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      console.log('Starting sync TO Google Calendar (current and next month only)...');
      
      // Get events from this month and next month only
      const localEvents = await getCurrentAndNextMonthEvents();
      console.log('Found local events for current and next month:', localEvents.length);
      
      // Filter to only events that haven't been synced yet (no googleEventId)
      const unsyncedEvents = localEvents.filter(event => !event.googleEventId);
      console.log('Found unsynced events:', unsyncedEvents.length);
      
      const results = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        details: []
      };
      
      // Process each unsynced event
      for (const localEvent of unsyncedEvents) {
        try {
          console.log('Processing unsynced event:', localEvent.eventName);
          
          // Convert local event to Google Calendar format
          const googleEventData = {
            title: localEvent.eventName,
            description: `導師: ${localEvent.doushi || ''}\n音響: ${localEvent.onkyo || ''}\n司会: ${localEvent.shikai || ''}\n受付: ${localEvent.uketsuke || ''}\nコメント: ${localEvent.comment || ''}`,
            start: new Date(localEvent.startTime).toISOString(),
            end: new Date(localEvent.endTime).toISOString(),
            allDay: false
          };
          
          const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
          let googleEvent;
          
          // Check for existing event by content (in case it was created manually in Google Calendar)
          console.log('Checking for existing event with same content...');
          const existingEvent = await findExistingGoogleEvent(googleEventData, calendarId);
          
          if (existingEvent) {
            console.log('Found existing event with same content, linking to database:', existingEvent.id);
            
            // Update our database to reference the existing Google Calendar event
            await setGoogleEventId(localEvent.id, existingEvent.id);
            
            // Update the existing event with our latest data
            googleEvent = await updateGoogleCalendarEvent(existingEvent.id, googleEventData, calendarId);
            results.updated++;
            results.details.push({
              localEventId: localEvent.id,
              googleEventId: existingEvent.id,
              title: localEvent.eventName,
              status: 'linked_and_updated'
            });
          } else {
            console.log('No existing event found, creating new one...');
            
            // Create new event in Google Calendar
            googleEvent = await createGoogleCalendarEvent(googleEventData, calendarId);
            
            // Update local event with Google Calendar ID
            await setGoogleEventId(localEvent.id, googleEvent.id);
            
            results.created++;
            results.details.push({
              localEventId: localEvent.id,
              googleEventId: googleEvent.id,
              title: localEvent.eventName,
              status: 'created'
            });
            
            console.log('Created new Google Calendar event:', googleEvent.id);
          }
          
        } catch (error) {
          console.error('Error processing event:', localEvent.eventName, error);
          results.errors++;
          results.details.push({
            localEventId: localEvent.id,
            title: localEvent.eventName,
            status: 'error',
            error: error.message
          });
        }
      }
      
      console.log('Sync completed:', results);
      res.status(200).json({
        success: true,
        message: `Sync completed: ${results.created} created, ${results.updated} updated, ${results.errors} errors`,
        results
      });
      
    } catch (error) {
      console.error('Sync to Google Calendar error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}