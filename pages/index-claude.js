import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import prisma from '../lib/prisma'; // Assuming you have a Prisma client set up

const localizer = momentLocalizer(moment);

const CalendarComponent = () => {
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({
    eventName: '',
    date: '',
    startTime: '',
    endTime: '',
    doushi: '',
    onkyo: '',
    shikai: '',
    uketsuke: '',
    comment: '',
  });

  useEffect(() => {
    const fetchEvents = async () => {
      const events = await prisma.event.findMany();
      const formattedEvents = events.map((event) => ({
        ...event,
        start: new Date(`${event.date} ${event.startTime}`),
        end: new Date(`${event.date} ${event.endTime}`),
      }));
      setEvents(formattedEvents);
    };

    fetchEvents();
  }, []);

  const handleInputChange = (e) => {
    setNewEvent({ ...newEvent, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newEventData = {
        ...newEvent,
        date: moment(newEvent.date).format('YYYY-MM-DD'),
      };
      await prisma.event.create({ data: newEventData });
      setNewEvent({
        eventName: '',
        date: '',
        startTime: '',
        endTime: '',
        doushi: '',
        onkyo: '',
        shikai: '',
        uketsuke: '',
        comment: '',
      });
      const events = await prisma.event.findMany();
      const formattedEvents = events.map((event) => ({
        ...event,
        start: new Date(`${event.date} ${event.startTime}`),
        end: new Date(`${event.date} ${event.endTime}`),
      }));
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  return (
    <div>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
      />
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="eventName"
          value={newEvent.eventName}
          onChange={handleInputChange}
          placeholder="Event Name"
        />
        <input
          type="date"
          name="date"
          value={newEvent.date}
          onChange={handleInputChange}
        />
        <input
          type="time"
          name="startTime"
          value={newEvent.startTime}
          onChange={handleInputChange}
        />
        <input
          type="time"
          name="endTime"
          value={newEvent.endTime}
          onChange={handleInputChange}
        />
        <input
          type="text"
          name="doushi"
          value={newEvent.doushi}
          onChange={handleInputChange}
          placeholder="doushi"
        />
        <input
          type="text"
          name="onkyo"
          value={newEvent.onkyo}
          onChange={handleInputChange}
          placeholder="onkyo"
        />
        <input
          type="text"
          name="shikai"
          value={newEvent.shikai}
          onChange={handleInputChange}
          placeholder="shikai"
        />
        <input
          type="text"
          name="uketsuke"
          value={newEvent.uketsuke}
          onChange={handleInputChange}
          placeholder="uketsuke"
        />
        <input
          type="text"
          name="comment"
          value={newEvent.comment}
          onChange={handleInputChange}
          placeholder="comment"
        />
        <button type="submit">Add Event</button>
      </form>
    </div>
  );
};

export default CalendarComponent;