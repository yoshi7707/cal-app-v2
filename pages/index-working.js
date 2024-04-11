import React, { useEffect, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';

import "../styles/App.module.css";

const localizer = momentLocalizer(moment);

const MyCalendar = () => {
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const [allEvents, setAllEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({
    title: "",
    start: "",
    end: ""
  });

  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const eventResponse = await fetch("/api/event", { cache: "no-store" });
        console.log('eventResponse', eventResponse);
        const eventData = await eventResponse.json();
        // setAllEvents(eventData);
        // setEvents(eventData)
        setEvents(eventData.map(event => ({
          id: event.id,
          title: event.eventName,
          start: new Date(event.startTime),
          end: new Date(event.endTime),
          doushi: event.doushi,
          onkyo: event.onkyo,
          shikai: event.shikai,
          uketsuke: event.uketsuke,
          comment: event.comment
        })));

        console.log("Event->", events);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    }
    fetchData();
    // console.log("Event->", events); // Move the console.log here
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setEvents([...events, {
      title,
      doushi: newEvent.doushi, // Include doushi from newEvent object
      onkyo: newEvent.onkyo,
      shikai: newEvent.shikai,
      uketsuke: newEvent.uketsuke,
      comment: newEvent.comment,
      start: new Date(start),
      end: new Date(end),
    }]);
    setTitle('');
    setNewEvent({
      title: "",
      doushi: "",
      onkyo: "",
      shikai: "",
      uketsuke: "",
      comment: ""
    });
    setStart('');
    setEnd('');

    const eventData = {
      eventName: title,
      date: "",
      startTime: start,
      endTime: end,
      doushi: newEvent.doushi ? newEvent.doushi : "",
      onkyo: newEvent.onkyo ? newEvent.onkyo : "",
      shikai: newEvent.shikai ? newEvent.shikai : "",
      uketsuke: newEvent.uketsuke ? newEvent.uketsuke : "",
      comment: newEvent.comment ? newEvent.comment : ""
    };
    try {
      const response = await fetch('/api/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        // Handle success response
        console.log('Event data submitted successfully!');
      } else {
        // Handle error response
        console.error('Failed to submit event data');
      }
    } catch (error) {
      console.error('Error submitting event data:', error);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={title}
          style={{ width: "20%", height: "30px", marginTop: "5px", marginRight: "10px" }}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="行事名"
          required
        />
        <input
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
        />
        <input
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          required
        />
        <div>
          <input type="text" placeholder="導師" style={{ width: "20%", height: "30px", marginTop: "5px", marginRight: "10px" }} value={newEvent.doushi} onChange={(e) => setNewEvent({ ...newEvent, doushi: e.target.value })} />
        </div>
        <div>
          <input type="text" placeholder="音響" style={{ width: "20%", height: "30px", marginTop: "5px", marginRight: "10px" }} value={newEvent.onkyo} onChange={(e) => setNewEvent({ ...newEvent, onkyo: e.target.value })} />
        </div>
        <div>
          <input type="text" placeholder="司会" style={{ width: "20%", height: "30px", marginTop: "5px", marginRight: "10px" }} value={newEvent.shikai} onChange={(e) => setNewEvent({ ...newEvent, shikai: e.target.value })} />
        </div>
        <div>
          <input type="text" placeholder="受付" style={{ width: "20%", height: "30px", marginTop: "5px", marginRight: "10px" }} value={newEvent.uketsuke} onChange={(e) => setNewEvent({ ...newEvent, uketsuke: e.target.value })} />
        </div>
        <div>
          <input type="text" placeholder="備考" style={{ width: "80%", height: "30px", marginTop: "5px", marginRight: "10px" }} value={newEvent.comment} onChange={(e) => setNewEvent({ ...newEvent, comment: e.target.value })} />
        </div>
        <button type="submit">上の行事を追加</button>
      </form>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        onSelectEvent={(event) => setSelectedEvent(event)}
        style={{ height: 800 }}
      />
      {title}, {start}, {end}

      {selectedEvent && (
        <div>
          <h2>＜行事詳細情報＞</h2>
          <p>Event ID: {selectedEvent.id}</p>
          <p>行事名: {selectedEvent.title}</p>
          <p>導師: {selectedEvent.doushi}</p>
          <p>音響: {selectedEvent.onkyo}</p>
          <p>司会: {selectedEvent.shikai}</p>
          <p>受付: {selectedEvent.uketsuke}</p>
          <p>開始時刻: {selectedEvent.start.toString()}</p>
          <p>開始時刻: {selectedEvent.end.toString()}</p>
          <p>備考: {selectedEvent.comment}</p>
        </div>
      )}
    </div>
  );
};

export default MyCalendar;
