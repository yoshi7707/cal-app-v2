// /prisma/event.js
import prisma from './prisma'

// READ
// export const getAllEvents = async () => {

//   console.log('here1.5');

//   const events = await prisma.event.findMany({})

//   console.log('here1.6');
//   return events
// }

// READ
export const getAllEvents = async () => {
  try {
    const events = await prisma.event.findMany({});
    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error; // Rethrow the error to handle it at a higher level
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
export const createEvent = async (memberId, eventName, date, reservation, attendance, comment) => {
    const event = await prisma.event.create({
    data: {
      member: {connect: { id: memberId } },
      eventName,
      date,
      reservation,
      attendance,
      comment,
    }
  })
  return event
}

// UPDATE
export const updateEvent = async (id, updateData) => {

console.log('event.id=', id);

  const event = await prisma.event.update({
    where: {
      id: id,
    },
    data: {
      ...updateData
    }
  })
  return event
}

// DELETE
export const deleteEvent = async id => {
  const event = await prisma.event.delete({
    where: {
      id
    }
  })
  return event
}