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

// Function to sync event with Google Calendar
async function syncEventWithGoogleCalendar(action, eventData, eventId) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/google-calendar/sync-single-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: action,
        eventData: eventData,
        eventId: eventId
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`Google Calendar sync ${action} result:`, result);
      return result;
    } else {
      console.error(`Failed to sync with Google Calendar for ${action}:`, response.statusText);
      return null;
    }
  } catch (error) {
    console.error(`Error syncing with Google Calendar for ${action}:`, error);
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
