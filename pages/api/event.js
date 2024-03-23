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
    updateEvent
  } from '../../prisma/event'

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
          const { memberId, eventName, date, reservation, attendance, comment } = req.body
          const event = await createEvent(memberId, eventName, date, reservation, attendance, comment )
          return res.json(event)
        }
        case 'PUT': { 
          // Update an existing event
          const { id, ...updateData } = req.body

          console.log('id in PUT=', req.query.id);
          console.log("updateData in PUT",updateData);

          const event = await updateEvent(req.query.id, updateData)
          return res.json(event)
        }
        case 'DELETE': {
          // Delete an existing event
          const { id } = req.body
          const event = await deleteEvent(id)
          return res.json(event)
        }
        default:
          break
      }
    } catch (error) {
      return res.status(500).json({ ...error, message: error.message })
    }
  }
