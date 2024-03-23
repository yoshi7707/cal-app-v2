"use client"

import format from "date-fns/format";
import getDay from "date-fns/getDay";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import React, { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/App.module.css";

import Link from "next/link";

const locales = {
    "en-US": require("date-fns/locale/en-US"),
};
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});


const eventsD = [
    {
        title: "Big Meeting",
        allDay: true,
        start: new Date(2024, 2, 17),
        end: new Date(2024, 2, 17),
    },
    {
        title: "Vacation",
        start: new Date(2024, 2, 7),
        end: new Date(2024, 2, 10),
    },
    {
        title: "Conference",
        start: new Date(2024, 2, 20),
        end: new Date(2024, 2, 23),
    },
];

function App() {
    const [newEvent, setNewEvent] = useState({ title: "", start: "", end: "" });
    const [allEvents, setAllEvents] = useState(eventsD);

    const [events, setEvents] = useState([]);

    const [selectedEvent, setSelectedEvent] = useState(null);

    // useEffect(() => {
    //     async function fetchData() {
    //         try {
    //             const eventResponse = await fetch("/api/event", { cache: "no-store" });
    //             console.log('eventResponse', eventResponse);
    //             const eventData = await eventResponse.json();
    //             setEvents(eventData);
    //             console.log("Event->", events);
    //         } catch (error) {
    //             console.error("Error fetching events:", error);
    //         }
    //     }
    //     fetchData();
    //     // console.log("Event->", events); // Move the console.log here
    // }, []);

    console.log("AllEvent->", allEvents);

    useEffect(() => {
        fetch("/api/event", { cache: "no-store" })
            .then(response => {
                console.log('eventResponse', response);
                return response.json();
            })
            .then(eventData => {
                console.log("Event Data:", eventData);
                setAllEvents(eventData);
            })
            .catch(error => {
                console.error("Error fetching events:", error);
            });
    }, []);

    console.log("allEents->", allEvents);

    function handleAddEvent() {

        for (let i = 0; i < allEvents.length; i++) {

            const d1 = new Date(allEvents[i].start);
            const d2 = new Date(newEvent.start);
            const d3 = new Date(allEvents[i].end);
            const d4 = new Date(newEvent.end);

            console.log(d1 <= d2);
            console.log(d2 <= d3);
            console.log(d1 <= d4);
            console.log(d4 <= d3);


            if (
                ((d1 <= d2) && (d2 <= d3)) || ((d1 <= d4) &&
                    (d4 <= d3))
            ) {
                alert("CLASH");
                break;
            }

        }

        setAllEvents([...allEvents, newEvent]);
    }

    return (
        <div className="App">
            <h1>Calendar</h1>
            <h2>Add New Event</h2>
            <div>
                <input type="text" placeholder="Add Title" style={{ width: "20%", marginRight: "10px" }} value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} />
                <DatePicker placeholderText="Start Date" style={{ marginRight: "10px" }} selected={newEvent.start} onChange={(start) => setNewEvent({ ...newEvent, start })} />
                <DatePicker placeholderText="End Date" selected={newEvent.end} onChange={(end) => setNewEvent({ ...newEvent, end })} />
                <button stlye={{ marginTop: "10px" }} onClick={handleAddEvent}>
                    Add Event
                </button>
            </div>
            <Calendar
                localizer={localizer}
                events={allEvents}
                startAccessor={(event) => new Date(event.startTime)}
                endAccessor={(event) => new Date(event.endTime)}
                titleAccessor={(event) => event.eventName}
                onSelectEvent={(event) => setSelectedEvent(event)}
                style={{ height: 1000, margin: "50px" }}
            />

            {selectedEvent && (
                <div>
                    <h2>＜行事詳細情報＞</h2>
                    <p>Title: {selectedEvent.eventName}</p>
                    <p>導師: {selectedEvent.doushi}</p>
                    <p>音響: {selectedEvent.onkyo}</p>
                    <p>司会: {selectedEvent.shikai}</p>
                    <p>受付: {selectedEvent.uketsuke}</p>
                    <p>開始時刻: {selectedEvent.startTime}</p>
                    <p>終了時刻: {selectedEvent.endTime}</p>
                    <p>備考: {selectedEvent.comment}</p>
                    {/* Add more properties as needed */}
                </div>
            )}
        </div>
    );
}

export default App;
