import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent, findExistingGoogleEvent } from '../../../lib/googleCalendar';
import { setGoogleEventId, getEventById } from '../../../prisma/event';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { action, eventData, eventId } = req.body;
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      
      console.log(`Syncing single event - Action: ${action}, Event ID: ${eventId}`);
      
      let result = {};
      
      switch (action) {
        case 'create':
          // Create new event in Google Calendar
          const googleEventData = {
            title: eventData.eventName,
            description: `導師: ${eventData.doushi || ''}\n音響: ${eventData.onkyo || ''}\n司会: ${eventData.shikai || ''}\n受付: ${eventData.uketsuke || ''}\nコメント: ${eventData.comment || ''}`,
            start: new Date(eventData.startTime).toISOString(),
            end: new Date(eventData.endTime).toISOString(),
            allDay: false
          };
          
          // Check for existing event with same content
          const existingEvent = await findExistingGoogleEvent(googleEventData, calendarId);
          
          if (existingEvent) {
            console.log('Found existing event with same content, linking to database:', existingEvent.id);
            await setGoogleEventId(eventId, existingEvent.id);
            
            // Update the existing event with our latest data
            const updatedEvent = await updateGoogleCalendarEvent(existingEvent.id, googleEventData, calendarId);
            result = {
              success: true,
              action: 'linked_and_updated',
              googleEventId: existingEvent.id,
              message: 'Event linked to existing Google Calendar event and updated'
            };
          } else {
            console.log('Creating new Google Calendar event...');
            const newGoogleEvent = await createGoogleCalendarEvent(googleEventData, calendarId);
            await setGoogleEventId(eventId, newGoogleEvent.id);
            
            result = {
              success: true,
              action: 'created',
              googleEventId: newGoogleEvent.id,
              message: 'Event created in Google Calendar'
            };
          }
          break;
          
        case 'update':
          // Update existing event in Google Calendar
          if (eventData.googleEventId) {
            const updateEventData = {
              title: eventData.eventName,
              description: `導師: ${eventData.doushi || ''}\n音響: ${eventData.onkyo || ''}\n司会: ${eventData.shikai || ''}\n受付: ${eventData.uketsuke || ''}\nコメント: ${eventData.comment || ''}`,
              start: new Date(eventData.startTime).toISOString(),
              end: new Date(eventData.endTime).toISOString(),
              allDay: false
            };
            
            try {
              const updatedEvent = await updateGoogleCalendarEvent(eventData.googleEventId, updateEventData, calendarId);
              result = {
                success: true,
                action: 'updated',
                googleEventId: eventData.googleEventId,
                message: 'Event updated in Google Calendar'
              };
            } catch (error) {
              console.log('Failed to update existing event, will create new one:', error.message);
              // If update fails (event might have been deleted), create new one
              const newGoogleEvent = await createGoogleCalendarEvent(updateEventData, calendarId);
              await setGoogleEventId(eventId, newGoogleEvent.id);
              
              result = {
                success: true,
                action: 'recreated',
                googleEventId: newGoogleEvent.id,
                message: 'Event recreated in Google Calendar'
              };
            }
          } else {
            // No googleEventId, treat as new event
            const createEventData = {
              title: eventData.eventName,
              description: `導師: ${eventData.doushi || ''}\n音響: ${eventData.onkyo || ''}\n司会: ${eventData.shikai || ''}\n受付: ${eventData.uketsuke || ''}\nコメント: ${eventData.comment || ''}`,
              start: new Date(eventData.startTime).toISOString(),
              end: new Date(eventData.endTime).toISOString(),
              allDay: false
            };
            
            const newGoogleEvent = await createGoogleCalendarEvent(createEventData, calendarId);
            await setGoogleEventId(eventId, newGoogleEvent.id);
            
            result = {
              success: true,
              action: 'created',
              googleEventId: newGoogleEvent.id,
              message: 'Event created in Google Calendar'
            };
          }
          break;
          
        case 'delete':
          // Delete event from Google Calendar
          if (eventData.googleEventId) {
            try {
              await deleteGoogleCalendarEvent(eventData.googleEventId, calendarId);
              result = {
                success: true,
                action: 'deleted',
                message: 'Event deleted from Google Calendar'
              };
            } catch (error) {
              console.log('Failed to delete from Google Calendar:', error.message);
              result = {
                success: true,
                action: 'delete_failed',
                message: 'Event deleted from database but failed to delete from Google Calendar'
              };
            }
          } else {
            result = {
              success: true,
              action: 'deleted',
              message: 'Event deleted from database (no Google Calendar sync)'
            };
          }
          break;
          
        default:
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid action. Must be "create", "update", or "delete"' 
          });
      }
      
      console.log('Single event sync completed:', result);
      res.status(200).json(result);
      
    } catch (error) {
      console.error('Single event sync error:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 