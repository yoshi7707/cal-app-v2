import React, { useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const MyCalendar = () => {
  const [showInput, setShowInput] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const events = [
    {
      id: 1,
      title: 'Event 1',
      start: new Date(),
      end: new Date(new Date().getTime() + 60 * 60 * 1000),
    },
    {
      id: 2,
      title: 'Event 2',
      start: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
      end: new Date(new Date().getTime() + 25 * 60 * 60 * 1000),
    },
  ];

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setShowInput(true);
  };

  const handleInputChange = (e) => {
    setSelectedEvent({ ...selectedEvent, title: e.target.value });
  };

  const handleInputCancel = () => {
    setShowInput(false);
    setSelectedEvent(null);
  };

  return (
    <Calendar
      localizer={localizer}
      events={events}
      startAccessor="start"
      endAccessor="end"
      style={{ height: 500 }}
      onSelectEvent={handleSelectEvent}
      components={{
        event: ({ event }) => (
          <div>
            {event.title}
            {showInput && selectedEvent?.id === event.id && (
              <div>
                <input
                  type="text"
                  value={selectedEvent.title}
                  onChange={handleInputChange}
                />
                <button onClick={handleInputCancel}>Cancel</button>
              </div>
            )}
          </div>
        ),
      }}
    />
  );
};

export default MyCalendar;