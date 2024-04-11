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
    const [newEvent, setNewEvent] = useState({
        doushi: "",
        onkyo: "",
        shikai: "",
        uketsuke: "",
        comment: ""
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

    const fetchEvents = async () => {
        try {
            const response = await fetch('/api/event');
            const eventData = await response.json();

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
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setEvents([...events, {
            title,
            // id: newEvent.id,
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
            id: newEvent.id ? newEvent.id : "",
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
                fetchEvents();
                // window.location.reload();
            } else {
                // Handle error response
                console.error('Failed to submit event data');
            }
        } catch (error) {
            console.error('Error submitting event data:', error);
        }
    };

    const handleEventChange = (propertyName, e) => {
        setSelectedEvent(prevSelectedEvent => ({
            ...prevSelectedEvent,
            [propertyName]: e.target.value,
        }));

    };

    const handleEditEvent = async () => {
        if (!selectedEvent || !selectedEvent.id) {
            return;
        }

        try {
            const eventData = {
                // id: selectedEvent.id,
                eventName: selectedEvent.title,
                date: "",
                startTime: start,
                endTime: end,
                // startTime: selectedEvent.start,
                // endTime: selectedEvent.end,
                doushi: selectedEvent.doushi,
                onkyo: selectedEvent.onkyo,
                shikai: selectedEvent.shikai,
                uketsuke: selectedEvent.uketsuke,
                comment: selectedEvent.comment
            };

            // Make a PUT request to update the event data in the database
            const response = await fetch(`/api/event?id=${selectedEvent.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData),
            });

            if (response.ok) {
                // Handle success response
                console.log('Event data updated successfully!');
                fetchEvents();
                // Optionally, you can fetch the updated event data and set it in the state
            } else {
                // Handle error response
                console.error('Failed to update event data');
            }
        } catch (error) {
            console.error('Error updating event data:', error);
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent.id) {
            return;
        }
        try {
            console.log(selectedEvent.id)
            const response = await fetch(`/api/event?id=${selectedEvent.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                // Handle success response
                console.log('Event deleted successfully!');
                // Filter out the deleted event from the events array
                const updatedEvents = events.filter(event => event.id !== selectedEvent.id);
                // Update the events state with the filtered events
                setEvents(updatedEvents);
                // Update the events state or perform any necessary actions
                setSelectedEvent(null);
            } else {
                // Handle error response
                console.error('Failed to delete event');
            }
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    };

    return (
        <div>
            <h2>行事入力</h2>
            <h4>（行事を選ぶと、カレンダーの下にその情報が表示されます😀）</h4>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    // value={selectedEvent && selectedEvent.title ? selectedEvent.title : ""}
                    style={{ width: "20%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="行事名"
                    required
                />
                <br /> {/* 改行を挿入 */}
                <label>開始時間：</label>
                <input
                    type="datetime-local"
                    value={start}
                    style={{ width: "30%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                    onChange={(e) => setStart(e.target.value)}
                    required
                />
                <br /> {/* 改行を挿入 */}
                <label>終了時間：</label>
                <input
                    type="datetime-local"
                    value={end}
                    style={{ width: "30%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                    onChange={(e) => setEnd(e.target.value)}
                    required
                />
                <div>
                    <input type="text"
                        placeholder="導師"
                        style={{ width: "20%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                        // value={selectedEvent && selectedEvent.doushi ? selectedEvent.doushi : ""}
                        onChange={(e) => setNewEvent({ ...newEvent, doushi: e.target.value })} />
                </div>
                <div>
                    <input type="text"
                        placeholder="音響"
                        style={{ width: "20%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                        value={newEvent.onkyo}
                        onChange={(e) => setNewEvent({ ...newEvent, onkyo: e.target.value })} />
                </div>
                <div>
                    <input type="text"
                        placeholder="司会"
                        style={{ width: "20%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                        value={newEvent.shikai}
                        onChange={(e) => setNewEvent({ ...newEvent, shikai: e.target.value })} />
                </div>
                <div>
                    <input type="text"
                        placeholder="受付"
                        style={{ width: "20%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                        value={newEvent.uketsuke}
                        onChange={(e) => setNewEvent({ ...newEvent, uketsuke: e.target.value })} />
                </div>
                <div>
                    <input type="text"
                        placeholder="備考"
                        style={{ width: "80%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                        value={newEvent.comment}
                        onChange={(e) => setNewEvent({ ...newEvent, comment: e.target.value })} />
                </div>
                <button type="submit"
                    style={{ width: "20%", height: "30px", marginTop: "10px", marginRight: "10px", marginBottom: "20px" }}
                >行事の追加</button>
            </form>

            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                // onClick={handleSelectEvent(event)}
                onSelectEvent={(event) => setSelectedEvent(event)}
                style={{ height: 1000 }}
            />
            {title}, {start}, {end}

            {selectedEvent && (
                <div>
                    <h2>＜行事詳細情報＞</h2>
                    <p>Event ID: {selectedEvent.id ? selectedEvent.id : 'N/A'}</p>
                    <label>行事名：</label>
                    <input
                        type="text"
                        value={selectedEvent.title ?? ""}
                        onChange={(e) => handleEventChange('title', e)}
                    />
                    <br /> {/* 改行を挿入 */}
                    <label>開始時間：</label>
                    <input
                        type="datetime-local"
                        // type="text"
                        value={selectedEvent.startTime}
                        // onChange={(e) => handleEventChange('startTime', e)}
                        onChange={(e) => setStart(e.target.value)}
                        required
                    />
                    <br /> {/* 改行を挿入 */}
                    <label>終了時間：</label>
                    <input
                        type="datetime-local"
                        value={selectedEvent.endTime}
                        // value={selectedEvent.endTime ? moment(selectedEvent.endTime).format("YYYY-MM-DDTHH:mm") : ""}
                        onChange={(e) => setEnd(e.target.value)}
                        required
                    />
                    <br /> {/* 改行を挿入 */}
                    <label>導師：</label>
                    <input
                        type="text"
                        value={selectedEvent.doushi ?? ""}
                        onChange={(e) => handleEventChange('doushi', e)}
                    />
                    <br /> {/* 改行を挿入 */}
                    <label>音響：</label>
                    <input
                        type="text"
                        value={selectedEvent.onkyo ?? ""}
                        onChange={(e) => handleEventChange('onkyo', e)}
                    />
                    <br /> {/* 改行を挿入 */}
                    <label>司会：</label>
                    <input
                        type="text"
                        value={selectedEvent.shikai ?? ""}
                        onChange={(e) => handleEventChange('shikai', e)}
                    />
                    <br /> {/* 改行を挿入 */}
                    <label>受付：</label>
                    <input
                        type="text"
                        value={selectedEvent.uketsuke ?? ""}
                        onChange={(e) => handleEventChange('uketsuke', e)}
                    />
                    <br /> {/* 改行を挿入 */}
                    <label>備考：</label>
                    <input
                        type="text"
                        value={selectedEvent.comment ?? ""}
                        onChange={(e) => handleEventChange('comment', e)}
                    />
                    <br /> {/* 改行を挿入 */}
                </div>
            )}

            {selectedEvent && (
                <button
                    onClick={handleDeleteEvent}
                    style={{ width: "20%", height: "30px", marginTop: "10px", marginRight: "10px", marginBottom: "20px" }}
                >上の行事の削除
                </button>
            )}

            {selectedEvent && (
                <button
                    onClick={handleEditEvent}
                    style={{ width: "20%", height: "30px", marginTop: "10px", marginRight: "10px", marginBottom: "20px" }}
                >上の内容で修正
                </button>
            )}
        </div>
    );
};

export default MyCalendar;