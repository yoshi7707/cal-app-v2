import React, { useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
// import '../styles/MyCalendar.module.css';

const localizer = momentLocalizer(moment);

const MyCalendar = () => {
    const [showInput, setShowInput] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);

    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [showPopup, setShowPopup] = useState(false);

    const data = {
        gyouji: ['「復活の祈り」', '七の日感謝祭'],
        doshis: ['田口義明', '馬場重善', '豊田利雄'],
        onkyos: ['相良屋', '油井', '豊田利雄'],
        shikais: ['野口', '油井', '豊田利雄'],
        uketsukes: ['北村', '油井', '豊田利雄'],
    };

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

    const handleSubmit = (e) => {
        setSelectedEvent({ ...selectedEvent, title: e.target.value });
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
        // setShowInput(true);
    };

    const handleOpenPopup = () => {
        setShowPopup(true);
    };

    const handleClosePopup = () => {
        setShowPopup(false);
    };

    return (
        <div>
            <button
                style={{ width: "20%", height: "30px", marginTop: "10px", marginRight: "10px", marginBottom: "20px" }}
                onClick={handleOpenPopup}>
                行事入力
            </button>

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
                            {data.doshis.map((doushi, index) => (
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
                            required
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
                            required
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
                            required
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
                style={{ height: 1000 }}
                startAccessor="start"
                endAccessor="end"
                // onClick={handleSelectEvent(event)}
                // onSelectEvent={(event) => setSelectedEvent(event)}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={() => {
                    if (typeof window !== 'undefined') {
                      window.alert("bbbbb");
                    }
                  }}
                // onSelectSlot={(slotInfo) => {
                //     const { start, end } = slotInfo;
                //     setIsPopupVisible(true);
                //     setSelectedDates({ start, end });
                //     // Handle the selection of an empty slot here
                //     // You can open a popup or modal with the start and end dates pre-filled in input boxes
                //     // You can use the start and end dates to pre-fill the input boxes in your popup
                //     console.log('Selected slot:', start, end);
                // }}
                eventPropGetter={(event) => {
                    if (event.title === "「復活の祈り」") {
                        return {
                            style: {
                                backgroundColor: 'red', // This sets the text color to red
                            }
                        };
                    }
                    return {}; // Return empty for events that don't match
                }}
                // showMultiDayTimes
                popup={true}
            />




            {/* <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 500 }}
                onSelectEvent={handleSelectEvent}
            // Include other necessary props
            /> */}


            {isPopupVisible && (
                <div className="popup">
                    <div className="popup-inner">
                        <h2>Modify Event</h2>
                        <select
                            // value={selectedEvent && selectedEvent.title ? selectedEvent.title : ""}
                            value={selectedEvent?.title || ""}
                            onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })}
                            required
                        >
                            <option value="">Select an event</option>
                            {data.gyouji.map((gyouji, index) => (
                                <option key={index} value={gyouji}>
                                    {gyouji}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedEvent?.doushi || ""}
                            onChange={(e) => setSelectedEvent({ ...selectedEvent, doushi: e.target.value })}
                            required
                        >
                            <option value="">Select a doushi</option>
                            {data.doshis.map((doushi, index) => (
                                <option key={index} value={doushi}>
                                    {doushi}
                                </option>
                            ))}
                        </select>
                        <button onClick={() => setIsPopupVisible(false)}>Close</button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MyCalendar;