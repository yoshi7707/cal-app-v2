import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma'
// import prisma from '../../prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const events = await prisma.event.findMany({
        orderBy: { date: 'asc' }, // Sort by start date (optional)
      });
      const formattedEvents = events.map((event) => ({
        id: event.id, // Ensure IDs are used for react-big-calendar
        title: event.eventName,
        start: new Date(event.date + 'T' + event.startTime), // Combine date and time
        end: new Date(event.date + 'T' + event.endTime),
      }));
      res.status(200).json(formattedEvents);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching events' });
    }
  } else if (req.method === 'POST') {
    try {
      const newEvent = req.body; // Parse new event data from request body
      const createdEvent = await prisma.event.create({
        data: newEvent,
      });
      res.status(201).json(createdEvent); // Send the created event back
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error creating event' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' }); // Handle unsupported methods
  }
}
