// /prisma/event.js
import prisma from './prisma'

// READ
// export const getAllEvents = async () => {

//   console.log('here1.5');

//   const events = await prisma.event.findMany({})

//   console.log('here1.6');
//   return events
// }

// READ - Get all events (original function)
export const getAllEvents = async () => {
  try {
    const events = await prisma.event.findMany({});
    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error; // Rethrow the error to handle it at a higher level
  }
};

// READ - Get events within a date range
export const getEventsInDateRange = async (startDate, endDate) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });
    return events;
  } catch (error) {
    console.error('Error fetching events in date range:', error);
    throw error;
  }
};

// READ - Get events for this month and next month
export const getCurrentAndNextMonthEvents = async () => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Start of current month
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    
    // End of next month
    const endOfNextMonth = new Date(currentYear, currentMonth + 2, 0);
    
    // Format dates as ISO strings for database comparison
    const startDate = startOfCurrentMonth.toISOString();
    const endDate = endOfNextMonth.toISOString();
    
    console.log(`Fetching events from ${startDate} to ${endDate}`);
    
    const events = await prisma.event.findMany({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { startTime: 'asc' }
    });
    
    console.log(`Found ${events.length} events in current and next month`);
    return events;
  } catch (error) {
    console.error('Error fetching current and next month events:', error);
    throw error;
  }
};

// READ - Get events that haven't been synced to Google Calendar yet
export const getUnsyncedEvents = async () => {
  try {
    const events = await prisma.event.findMany({
      where: {
        googleEventId: null
      }
    });
    return events;
  } catch (error) {
    console.error('Error fetching unsynced events:', error);
    throw error;
  }
};

// READ - Get events that have been synced to Google Calendar
export const getSyncedEvents = async () => {
  try {
    const events = await prisma.event.findMany({
      where: {
        googleEventId: {
          not: null
        }
      }
    });
    return events;
  } catch (error) {
    console.error('Error fetching synced events:', error);
    throw error;
  }
};

// READ - Get a single event by ID
export const getEventById = async (id) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: id }
    });
    return event;
  } catch (error) {
    console.error('Error fetching event by ID:', error);
    throw error;
  }
};

export const getEvent = async (id) => {
  const event = await prisma.event.findMany({
    where: {
        memberId: id,
  }
})
  return event
}

export const getOneEvent = async (id) => {
  const event = await prisma.event.findMany({
    where: {
        eventName: id,
  }
})
  return event
}

//CREATE
export const createEvent = async (eventName, date, startTime, endTime, doushi, onkyo, shikai, uketsuke, comment) => {
    const event = await prisma.event.create({
    data: {
      eventName,
      date,
      startTime,
      endTime,
      doushi,
      onkyo,
      shikai,
      uketsuke,
      comment
    }
  })
  return event
}

// UPDATE
export const updateEvent = async (id, updateData) => {
  try {
    console.log('event.id=', id);
    console.log('updateData->', updateData);

    const event = await prisma.event.update({
      where: { id },
      data: { ...updateData }
    });
    return event;
  } catch (error) {
    console.error('Error updating event:', error);
    throw error; // Rethrow or handle the error appropriately
  }
};

// UPDATE - Set Google Calendar event ID
export const setGoogleEventId = async (eventId, googleEventId) => {
  try {
    const event = await prisma.event.update({
      where: { id: eventId },
      data: { googleEventId }
    });
    return event;
  } catch (error) {
    console.error('Error setting Google event ID:', error);
    throw error;
  }
};

// export const updateEvent = async (id, updateData) => {

// console.log('event.id=', id);
// console.log('updateData->', updateData);

//   const event = await prisma.event.update({
//     where: {
//       id: id,
//     },
//     data: {
//       ...updateData
//     }
//   })
//   return event
// }

// DELETE
export const deleteEvent = async id => {
  const event = await prisma.event.delete({
    where: {
      id
    }
  })
  return event
}