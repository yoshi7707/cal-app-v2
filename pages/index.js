import React, { useEffect, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';

import styles from '../styles/App.module.css';

// import "../styles/App.module.css";

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

    const data = {
        gyouji: [
            '「復活の祈り」',
            '七の日感謝祭',
            '発展・繁栄系祈願祭',
            '降魔・病気平癒系祈願祭',
            'The Missionミーティング',
            '「心の修行」',
            '百歳会',
            'いま学びたい御法話セミナー',
            '御法話拝聴会',
            '映画上映会',
            '伝道ー御法話拝聴会',
            '新復活祭',
            'ヘルメス大祭',
            '5月研修',
            '家庭ユートピア大祭',
            '供養祭',
            '御生誕祭',
            'エル・カンターレ祭',
            '街宣',
            '外部講師セミナー',
            '本部行事',
            '集い',
            'その他'
        ],
        doushis: [
            '田口義明',
            '馬場重善',
            '豊田利雄',
            '北村かおり',
            '豊田奈奈美',
            '渡辺和重',
            '飯田剛',
            '渡辺聖子',
            '野口佐知子',
            '鮫島三重子',
            '土谷恵',
            '中島真美',
            '中島謙一郎',
            'その他',
        ],
        onkyos: [
            '相良屋昌夫',
            '油井房雄',
            '豊田奈奈美',
            '北村かおり',
            '渡辺聖子',
            '野口佐知子',
            '土谷恵',
            '中島真美',
            '大森美都里',
            '神えり',
            'その他',
            ''
        ],
        shikais: [
            '豊田奈奈美',
            '北村かおり',
            '渡辺聖子',
            '野口佐知子',
            '土谷恵',
            '中島真美',
            'その他',
            ''
        ],
        uketsukes: [
            '豊田奈奈美',
            '北村かおり',
            '渡辺聖子',
            '野口佐知子',
            '土谷恵',
            '中島真美',
            '鮫島三重子',
            'その他',
            ''
        ],
    };

    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [showPopup, setShowPopup] = useState(false);

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
            title: selectedEvent.title,
            // id: newEvent.id,
            doushi: selectedEvent.doushi, // Include doushi from newEvent object
            onkyo: selectedEvent.onkyo,
            shikai: selectedEvent.shikai,
            uketsuke: selectedEvent.uketsuke,
            comment: selectedEvent.comment,
            start: new Date(start),
            end: new Date(end),
        }]);
        setTitle('');
        setSelectedEvent({
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
            eventName: selectedEvent.title ? selectedEvent.title : "",
            date: "",
            startTime: start,
            endTime: end,
            id: newEvent.id ? newEvent.id : "",
            doushi: selectedEvent.doushi ? selectedEvent.doushi : "",
            onkyo: selectedEvent.onkyo ? selectedEvent.onkyo : "",
            shikai: selectedEvent.shikai ? selectedEvent.shikai : "",
            uketsuke: selectedEvent.uketsuke ? selectedEvent.uketsuke : "",
            comment: selectedEvent.comment ? selectedEvent.comment : ""
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
                setIsPopupVisible(false);
                setShowPopup(false);

                // window.location.reload();
            } else {
                // Handle error response
                console.error('Failed to submit event data');
            }
        } catch (error) {
            console.error('Error submitting event data:', error);
        }
    };

    const handleOpenPopup = () => {
        setShowPopup(true);
    };

    const handleClosePopup = () => {
        setShowPopup(false);
    };

    const handleEventChange = (propertyName, e) => {
        setSelectedEvent(prevSelectedEvent => ({
            ...prevSelectedEvent,
            [propertyName]: e.target.value,
        }));
    };

    const handleSelectEvent = (event) => {
        setSelectedEvent(event);
        setIsPopupVisible(true);
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
                // startTime: selectedEvent.start,
                startTime: start,
                endTime: end,
                // endTime: selectedEvent.end.toString(),        
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
                setIsPopupVisible(false);
                fetchEvents();
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
                setIsPopupVisible(false);
            } else {
                // Handle error response
                console.error('Failed to delete event');
            }
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    };

    return (
        <div className={styles.App}>
            <h2>＜越谷支部行事一覧＞</h2>
            <form onSubmit={handleSubmit}>
                {showPopup && (
                    <div className="popup">
                        <div className="popup-inner">
                            <h2>行事入力</h2>
                            <label>行事：</label>
                            <select
                                style={{
                                    width: '60%',
                                    height: '30px',
                                    marginTop: '5px',
                                    marginRight: '10px',
                                }}
                                //   value={selectedEvent.title || ''}
                                onChange={(e) => handleEventChange('title', e)}
                                required
                            >
                                <option value="">行事選択</option>
                                {data.gyouji.map((gyouji, index) => (
                                    <option key={index} value={gyouji}>
                                        {gyouji}
                                    </option>
                                ))}
                            </select>
                            <br />
                            <label>開始時間：</label>
                            <input
                                type="datetime-local"
                                // value={start}
                                style={{ width: "70%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                                onChange={(e) => setStart(e.target.value)}
                                required
                            />
                            <br /> {/* 改行を挿入 */}
                            <label>終了時間：</label>
                            <input
                                type="datetime-local"
                                // value={end}
                                style={{ width: "70%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                                onChange={(e) => setEnd(e.target.value)}
                                required
                            />
                            <br />
                            <label>導師：</label>
                            <select
                                style={{
                                    width: '60%',
                                    height: '30px',
                                    marginTop: '5px',
                                    marginRight: '10px',
                                }}
                                //   value={selectedEvent.doushi || ''}
                                onChange={(e) => handleEventChange('doushi', e)}
                                required
                            >
                                <option value="">導師選択</option>
                                {data.doushis.map((doushi, index) => (
                                    <option key={index} value={doushi}>
                                        {doushi}
                                    </option>
                                ))}
                            </select>
                            <br />
                            <label>音響：</label>
                            <select
                                style={{
                                    width: '60%',
                                    height: '30px',
                                    marginTop: '5px',
                                    marginRight: '10px',
                                }}
                                //   value={selectedEvent.doushi || ''}
                                onChange={(e) => handleEventChange('onkyo', e)}
                            // required
                            >
                                <option value="">音響選択</option>
                                {data.onkyos.map((onkyo, index) => (
                                    <option key={index} value={onkyo}>
                                        {onkyo}
                                    </option>
                                ))}
                            </select>
                            <br />
                            <label>司会：</label>
                            <select
                                style={{
                                    width: '60%',
                                    height: '30px',
                                    marginTop: '5px',
                                    marginRight: '10px',
                                }}
                                //   value={selectedEvent.doushi || ''}
                                onChange={(e) => handleEventChange('shikai', e)}
                            // required
                            >
                                <option value="">司会選択</option>
                                {data.shikais.map((shikai, index) => (
                                    <option key={index} value={shikai}>
                                        {shikai}
                                    </option>
                                ))}
                            </select>
                            <br />
                            <label>受付：</label>
                            <select
                                style={{
                                    width: '60%',
                                    height: '30px',
                                    marginTop: '5px',
                                    marginRight: '10px',
                                }}
                                //   value={selectedEvent.doushi || ''}
                                onChange={(e) => handleEventChange('uketsuke', e)}
                            // required
                            >
                                <option value="">受付選択</option>
                                {data.uketsukes.map((uketsuke, index) => (
                                    <option key={index} value={uketsuke}>
                                        {uketsuke}
                                    </option>
                                ))}
                            </select>
                            <br />
                            <label>備考：</label>
                            <input
                                type="text"
                                // value={selectedEvent.comment}
                                style={{ width: "80%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                                onChange={(e) => setSelectedEvent({ ...selectedEvent, comment: e.target.value })}
                                placeholder="備考"
                            />
                            <br />
                            <button
                                style={{ width: "30%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                                onClick={handleSubmit}>
                                行事の追加
                            </button>
                            <button onClick={handleClosePopup}>キャンセル</button>
                        </div>
                    </div>
                )}
            </form>

            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                // onClick={handleSelectEvent(event)}
                // onSelectEvent={(event) => setSelectedEvent(event)}
                onSelectEvent={handleSelectEvent}
                style={{ height: 1000 }}
            />

            {isPopupVisible && (
                <div className="popup">
                    <div className="popup-inner">
                        <h2>行事の追加・変更・削除</h2>
                        <label>行事：{selectedEvent.title || ''}</label>
                        <select
                            style={{
                                width: '50%',
                                height: '30px',
                                marginTop: '5px',
                                marginLeft: '10px',
                            }}
                            // value={selectedEvent.title || ''}
                            onChange={(e) => handleEventChange('title', e)}
                            required
                        >
                            <option value="">行事の追加</option>
                            {data.gyouji.map((gyouji, index) => (
                                <option key={index} value={gyouji}>
                                    {gyouji}
                                </option>
                            ))}
                        </select>
                        <br />
                        <label>開始時間：{selectedEvent?.start?.toString() ?? ""}</label>
                        <input
                            type="datetime-local"
                            value={start}
                            style={{ width: "70%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                            // onChange={(e) => handleEventChange('start', e)}
                            // onChange={(e) => setStart(e.target.value)}
                            onChange={(e) => {
                                console.log('New start time:', e.target.value);
                                setStart(e.target.value);
                            }}
                            required
                        />
                        <br /> {/* 改行を挿入 */}
                        <label>終了時間：{selectedEvent?.end?.toString() ?? ""}</label>
                        <input
                            type="datetime-local"
                            value={end}
                            style={{ width: "70%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                            onChange={(e) => setEnd(e.target.value)}
                            required
                        />
                        <br />
                        <label>導師：{selectedEvent.doushi || ''}</label>
                        <select
                            style={{
                                width: '50%',
                                height: '30px',
                                marginTop: '5px',
                                marginLeft: '10px',
                            }}
                            // value={selectedEvent.doushi || ''}
                            onChange={(e) => handleEventChange('doushi', e)}
                            required
                        >
                            <option value="">導師選択</option>
                            {data.doushis.map((doushi, index) => (
                                <option key={index} value={doushi}>
                                    {doushi}
                                </option>
                            ))}
                        </select>
                        <br />
                        <label>音響：{selectedEvent.onkyo || ''}</label>
                        <select
                            style={{
                                width: '60%',
                                height: '30px',
                                marginTop: '5px',
                                marginLeft: '10px',
                            }}
                            //   value={selectedEvent.doushi || ''}
                            onChange={(e) => handleEventChange('onkyo', e)}
                        // required
                        >
                            <option value="">音響選択</option>
                            {data.onkyos.map((onkyo, index) => (
                                <option key={index} value={onkyo}>
                                    {onkyo}
                                </option>
                            ))}
                        </select>
                        <br />
                        <label>司会：{selectedEvent.shikai || ''}</label>
                        <select
                            style={{
                                width: '60%',
                                height: '30px',
                                marginTop: '5px',
                                marginRight: '10px',
                            }}
                            //   value={selectedEvent.doushi || ''}
                            onChange={(e) => handleEventChange('shikai', e)}
                        // required
                        >
                            <option value="">司会選択</option>
                            {data.shikais.map((shikai, index) => (
                                <option key={index} value={shikai}>
                                    {shikai}
                                </option>
                            ))}
                        </select>
                        <br />
                        <label>受付：{selectedEvent.uketsuke || ''}</label>
                        <select
                            style={{
                                width: '60%',
                                height: '30px',
                                marginTop: '5px',
                                marginRight: '10px',
                            }}
                            //   value={selectedEvent.doushi || ''}
                            onChange={(e) => handleEventChange('uketsuke', e)}
                        // required
                        >
                            <option value="">受付選択</option>
                            {data.uketsukes.map((uketsuke, index) => (
                                <option key={index} value={uketsuke}>
                                    {uketsuke}
                                </option>
                            ))}
                        </select>
                        <br />
                        <label>備考：{selectedEvent.comment || ''}</label>
                        <input
                            type="text"
                            value={selectedEvent.comment}
                            style={{ width: "80%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                            onChange={(e) => setSelectedEvent({ ...selectedEvent, comment: e.target.value })}
                            placeholder="備考"
                        />
                        <br />
                        <button
                            style={{ width: "30%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                            onClick={handleSubmit}>
                            行事の追加
                        </button>
                        <button
                            style={{ width: "30%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                            onClick={handleEditEvent}>
                            行事の修正
                        </button>
                        <button
                            onClick={handleDeleteEvent}
                            style={{ width: "30%", height: "30px", marginTop: "10px", marginRight: "10px", marginBottom: "20px" }}
                        >行事の削除
                        </button>
                        <br />
                        <button
                            style={{ width: "30%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                            onClick={() => setIsPopupVisible(false)}>
                            キャンセル
                        </button>
                    </div>
                </div>
            )}
            <button
                style={{ width: "30%", height: "30px", marginTop: "10px", marginRight: "10px", marginBottom: "20px" }}
                onClick={handleOpenPopup}>
                新規行事入力
            </button>
        </div>
    );
};

export default MyCalendar;