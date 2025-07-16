//prisma/event.js
import prisma from '../../lib/prisma'
import next from "next"
import { PrismaClient } from '@prisma/client'

// pages/api/event

import {
    createEvent,
    deleteEvent,
    getAllEvents,
    getEvent,
    updateEvent,
    getEventById
  } from '../../prisma/event'

// Import Google Calendar functions directly
import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent, findExistingGoogleEvent } from '../../lib/googleCalendar';
import { setGoogleEventId } from '../../prisma/event';

// Function to sync event with Google Calendar (direct call, no internal API)
async function syncEventWithGoogleCalendar(action, eventData, eventId) {
  try {
    console.log(`=== SYNC DEBUG: Starting ${action} sync ===`);
    console.log('Event data:', eventData);
    console.log('Event ID:', eventId);
    
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    console.log('Calendar ID:', calendarId);
    
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
        
        console.log('Google event data:', googleEventData);
        
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
        console.error('Invalid action:', action);
        return null;
    }
    
    console.log(`=== SYNC DEBUG: ${action} sync completed ===`);
    console.log('Result:', result);
    return result;
    
  } catch (error) {
    console.error(`=== SYNC DEBUG: Error in ${action} sync ===`);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return null;
  }
}

// export default handler;
  
  export default async function handler (req, res) {
    try {
      switch (req.method) {
        case 'GET': {
          if (req.query.id) {
            // Get a single event if id is provided is the query
            // api/event?id=1
            //console.log(req.query.id)
            const event = await getEvent(req.query.id)
            return res.status(200).json(event)
          } else {
            // Otherwise, fetch all events
            console.log("here");
            const events = await getAllEvents()
            console.log("here2");
            console.log("events", events);
            return res.json(events)
          }
        }
        case 'POST': {
          // Create a new event
          const { eventName, date, startTime, endTime, doushi, onkyo, shikai, uketsuke, comment } = req.body;
          const event = await createEvent(eventName, date, startTime, endTime, doushi, onkyo, shikai, uketsuke, comment )
          
          // Sync with Google Calendar
          const syncResult = await syncEventWithGoogleCalendar('create', {
            eventName,
            date,
            startTime,
            endTime,
            doushi,
            onkyo,
            shikai,
            uketsuke,
            comment
          }, event.id);
          
          return res.json({
            ...event,
            googleCalendarSync: syncResult
          });
        }
        case 'PUT': { 
          // Update an existing event
          // const id = req.query.id;
          const { ...updateData } = req.body

          // const { id, ...updateData } = req.body

          console.log('id in PUT=', req.query.id);
          console.log("updateData in PUT",updateData);

          const event = await updateEvent(req.query.id, updateData)
          
          // Get the updated event with googleEventId
          const updatedEvent = await getEventById(req.query.id);
          
          // Sync with Google Calendar
          const syncResult = await syncEventWithGoogleCalendar('update', {
            ...updateData,
            googleEventId: updatedEvent.googleEventId
          }, req.query.id);
          
          return res.json({
            ...event,
            googleCalendarSync: syncResult
          });
        }
        case 'DELETE': {
          console.log('// Delete an existing event');
          const id = req.query.id;
          // const { id } = req.body
          console.log('api----->', id);
          
          // Get the event before deleting to check if it has googleEventId
          const eventToDelete = await getEventById(id);
          
          const event = await deleteEvent(id)
          
          // Sync with Google Calendar (delete)
          const syncResult = await syncEventWithGoogleCalendar('delete', {
            googleEventId: eventToDelete?.googleEventId
          }, id);
          
          return res.json({
            ...event,
            googleCalendarSync: syncResult
          });
        }
        default:
          break
      }
    } catch (error) {
      return res.status(500).json({ ...error, message: error.message })
    }
  }
