import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Calendar, momentLocalizer, Views, DateLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import 'moment/locale/ja';
moment.locale('ja');
import * as dates from '../react-big-calendar/src/utils/dates'

import withDragAndDrop from '../react-big-calendar/src/addons/dragAndDrop'
const DragAndDropCalendar = withDragAndDrop(Calendar)

import { dateFnsLocalizer } from 'react-big-calendar';
import dateFns from 'date-fns';
// import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";

import { format, parseISO } from 'date-fns';

import { setHours, setMinutes } from 'date-fns';

const localizerFnc = dateFnsLocalizer({
  dateFns,
  format: 'yyyy/MM/dd',
  parse,
  startOfWeek: (start) => new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0),
  getDay,
  // locales,
});

import styles from '../styles/App.module.css';

// import "../styles/App.module.css";
const min = setHours(setMinutes(new Date(), 0), 8);
const max = setHours(setMinutes(new Date(), 0), 22);

const localizer = momentLocalizer(moment);

const EventComponent = ({ event }) => (
  <div>
    <div className="smaller-title">{event.title}</div>
    <div className="smaller-font">導: {event.doushi}</div>
    <div className="smaller-font">音: {event.onkyo}</div>
    {/* Add more custom fields here */}
  </div>
);

const MyCalendar = () => {
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const [isLoading, setIsLoading] = useState(true);

  const [isStartModified, setIsStartModified] = useState(false);
  const [isEndModified, setIsEndModified] = useState(false);

  const [selectedDates, setSelectedDates] = useState({ start: null, end: null });

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
      '新祈願祭',
      '月例法座「心の指針」',
      '「未来創造ミーティング」',
      '「心の修行」',
      '百歳会',
      'いま学びたい御法話セミナー',
      'エンゼルプラン',
      'サクセスNo.1',
      '親子',
      '御法話拝聴会',
      '経典セミナー',
      '映画上映会',
      '伝道ー御法話拝聴会',
      '新年大祭',
      '新復活祭',
      'ヘルメス大祭',
      '5月研修',
      '家庭ユートピア祈願大祭',
      '幸福供養祭',
      '大悟祭',
      '初転法輪記念祭',
      '御生誕祭',
      'エル・カンターレ祭',
      '降魔成道記念式典',
      '初級セミナー',
      '中級セミナー',
      '上級セミナー',
      '街宣',
      '外部講師セミナー',
      '総合本部行事',
      '埼玉本部行事',
      '集い',
      '地区会',
      'チーム会',
      '伝道ミーティング',
      '植福ミーティング',
      'PDCAミーティング',
      'ネバーマインド',
      'ふれあい',
      '支部長会議',
      'その他'
    ],
    doushis: [
      '支部長',
      '職員',
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
      '相良屋昌夫',
      '神えり',
      '黒田信子',
      '雨谷大',
      '根本美智子',
      '池田君枝',
      '山崎裕加',
      '吉田瑞季',
      '外部講師',
      'DVD対応',
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
      '武藤啓子',
      '神えり',
      '根本美智子',
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

  //drug & copy proccess ==================================================

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const eventResponse = await fetch("/api/event", { cache: "no-store" });
        console.log('eventResponse', eventResponse);
        const eventData = await eventResponse.json();

        setIsLoading(false)
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
        setIsLoading(false);
      }
    }
    fetchData();
    setIsLoading(false);
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
    // Check if end date is after start date
    if (selectedDates.end <= selectedDates.start) {
      alert('End time must be after the start time.');
      return;
    }

    // 1 day in milliseconds
    const oneDay = 4 * 60 * 60 * 1000;

    if (selectedDates.end - selectedDates.start >= oneDay) {
      const confirmResponse = confirm('End time must be more 4hrs than one day after the start time. Do you want to proceed?');

      if (!confirmResponse) {
        // If user clicks "Cancel", exit the function
        return;
      }

      // If user clicks "OK", continue with the function
    }


    // // 1 day in milliseconds
    // const oneDay = 24 * 60 * 60 * 1000;

    // if (selectedDates.end - selectedDates.start >= oneDay) {
    //   alert('End time must be more than one day after the start time.');
    //   return;
    // }

    const adjustedStart = new Date(selectedDates.start.getTime());
    const adjustedEnd = new Date(selectedDates.end.getTime());

    // Adjust the time to be in JST
    adjustedStart.setHours(adjustedStart.getHours() - 9);
    adjustedEnd.setHours(adjustedEnd.getHours() - 9);

    setEvents([...events, {
      title: selectedEvent.title,
      // id: newEvent.id,
      doushi: selectedEvent.doushi, // Include doushi from newEvent object
      onkyo: selectedEvent.onkyo,
      shikai: selectedEvent.shikai,
      uketsuke: selectedEvent.uketsuke,
      comment: selectedEvent.comment,
      start: adjustedStart,
      end: adjustedEnd,
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
      startTime: adjustedStart.toISOString(),
      endTime: adjustedEnd.toISOString(),
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

        // Reset state after successful creation
        setTitle('');
        setStart('');
        setEnd('');

        setSelectedDates({ start: null, end: null });
        setSelectedEvent({
          title: "",
          doushi: "",
          onkyo: "",
          shikai: "",
          uketsuke: "",
          comment: ""
        });
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
    setSelectedDates({ start: null, end: null });
    setSelectedEvent({
      title: "",
      doushi: "",
      onkyo: "",
      shikai: "",
      uketsuke: "",
      comment: ""
    });
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
  
        // Get the final start and end times
        const finalStart = isStartModified ? new Date(start) : selectedEvent.start;
        const finalEnd = isEndModified ? new Date(end) : selectedEvent.end;
    
        if (!selectedEvent || !selectedEvent.id) {
            return;
        }
    
        // Check if the end time is before the start time
        if (finalEnd <= finalStart) {
            alert("終了時間を入力してください。");
            return; // Exit the function
        }
    
        // Calculate time difference in milliseconds
        const timeDiff = finalEnd - finalStart;
        const fourHoursInMs = 4 * 60 * 60 * 1000;
    
        // Check if duration is more than 4 hours
        if (timeDiff > fourHoursInMs) {
            const confirmResponse = confirm('終了時間が開始時間から4時間以上経過していますが、このまま続けますか？');
    
            if (!confirmResponse) {
                // If user clicks "Cancel", exit the function
                return;
            }
            // If user clicks "OK", continue with the update
        }

    try {
      const eventData = {
        // id: selectedEvent.id,
        eventName: selectedEvent.title,
        date: "",
        startTime: finalStart,
        endTime: finalEnd,
        // startTime: start,
        // endTime: end,
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

        // Reset state after successful edit
        // setStart('');
        // setEnd('');

        setSelectedDates({ start: null, end: null });
        setSelectedEvent({
          title: "",
          doushi: "",
          onkyo: "",
          shikai: "",
          uketsuke: "",
          comment: ""
        });
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

  const { defaultDate, scrollToTime } = useMemo(
    () => ({
      defaultDate: new Date(2015, 3, 12),
      scrollToTime: new Date(1970, 1, 1, 6),
    }),
    []
  )

  const resizeEvent = useCallback(
    async ({ event, start, end }) => {
      try {
        // Make a PUT request to update the event data in the database
        const response = await fetch(`/api/event?id=${event.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventName: event.title,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            doushi: event.doushi,
            onkyo: event.onkyo,
            shikai: event.shikai,
            uketsuke: event.uketsuke,
            comment: event.comment,
          }),
        });

        if (response.ok) {
          // Handle success response
          console.log('Event data updated successfully!');
          // Update events state
          setEvents((prevEvents) => {
            const updatedEvents = prevEvents.map((prevEvent) => {
              if (prevEvent.id === event.id) {
                return { ...prevEvent, start, end };
              }
              return prevEvent;
            });
            return updatedEvents;
          });
        } else {
          // Handle error response
          console.error('Failed to update event data');
        }
      } catch (error) {
        console.error('Error updating event data:', error);
      }
    },
    [setEvents]
  );

  const [myEvents, setMyEvents] = useState(events)

  //drug & copy proccess ==================================================

  const moveEvent = useCallback(
    async ({ event, start, end, isAllDay: droppedOnAllDaySlot = false }) => {
      const { allDay } = event;
      if (!allDay && droppedOnAllDaySlot) {
        event.allDay = true;
      }

      const updatedEvent = { ...event, start, end, allDay };

      try {
        // Make a PUT request to update the event data in the database
        const response = await fetch(`/api/event?id=${event.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventName: event.title,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            doushi: event.doushi,
            onkyo: event.onkyo,
            shikai: event.shikai,
            uketsuke: event.uketsuke,
            comment: event.comment,
          }),
        });

        if (response.ok) {
          // Handle success response
          console.log('Event data updated successfully!');
          // Update myEvents state
          setMyEvents((prev) => {
            const existingEvents = prev.filter((ev) => ev.id !== event.id);
            return [...existingEvents, updatedEvent];
          });

          // Update events state
          setEvents((prev) => {
            const existingEvents = prev.filter((ev) => ev.id !== event.id);
            return [...existingEvents, updatedEvent];
          });
        } else {
          // Handle error response
          console.error('Failed to update event data');
        }
      } catch (error) {
        console.error('Error updating event data:', error);
      }
    },
    [setMyEvents, setEvents]
  );

  const handleEventCopy = useCallback(
    async ({ event, start, end, isAllDay: droppedOnAllDaySlot = false }) => {
      const { allDay } = event;
      if (!allDay && droppedOnAllDaySlot) {
        event.allDay = true;
      }

      const adjustedStart = new Date(start.getTime() - (start.getTimezoneOffset() * 60000));
      const adjustedEnd = new Date(end.getTime() - (end.getTimezoneOffset() * 60000));

      adjustedStart.setHours(adjustedStart.getHours() - 9);
      adjustedEnd.setHours(adjustedEnd.getHours() - 9);

      try {
        const eventData = {
          eventName: event.title,
          date: "",
          startTime: adjustedStart.toISOString(),
          endTime: adjustedEnd.toISOString(),
          doushi: event.doushi,
          onkyo: event.onkyo,
          shikai: event.shikai,
          uketsuke: event.uketsuke,
          comment: event.comment,
        };

        const response = await fetch('/api/event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        });

        if (response.ok) {
          console.log('Event copied successfully!');
          fetchEvents(); // Fetch the updated event list from the server
          setMyEvents((prev) => {
            const existingEvents = prev.filter((ev) => ev.id !== event.id);
            const newEvent = {
              ...event,
              start: adjustedStart,
              end: adjustedEnd,
            };
            return [...existingEvents, newEvent];
          });
        } else {
          console.error('Failed to copy event');
        }
      } catch (error) {
        console.error('Error copying event:', error);
      }
    },
    [fetchEvents, setMyEvents]
  );

  const handleEventPaste = ({ event, e }) => {
    // Handle event paste logic here
    console.log('Event pasted:', event);
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
              <label>開始時間：{selectedDates.start ? selectedDates.start.toISOString('ja-JP', { dateStyle: 'medium', timeStyle: 'medium' }).slice(0, 16) : ''}</label>
              {/* <label>開始時間：{selectedDates?.start ? selectedDates.start.toLocaleString('ja-JP') : ""}</label> */}
              <input
                type="datetime-local"
                // type="text"
                value={selectedDates.start ? selectedDates.start.toISOString('ja-JP', { dateStyle: 'medium', timeStyle: 'medium' }).slice(0, 16) : ''}
                style={{ width: "70%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                // onChange={(e) => setStart(e.target.value)}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  const adjustedTime = new Date(newDate.getTime() - (newDate.getTimezoneOffset() * 60000));// const adjustedStart = new Date(newDate);
                  // newDate.setHours(newDate.getHours() + 9);
                  // adjustedStart.setHours(newDate.getHours() - 9);
                  setSelectedDates({ ...selectedDates, start: adjustedTime });
                }}
                required
              />
              <br /> {/* 改行を挿入 */}
              <label>終了時間：{selectedDates.end ? selectedDates.end.toISOString('ja-JP', { dateStyle: 'medium', timeStyle: 'medium' }).slice(0, 16) : ''}</label>
              <input
                type="datetime-local"
                value={selectedDates.end ? selectedDates.end.toISOString('ja-JP').slice(0, 16) : ''}
                style={{ width: "70%", height: "30px", marginTop: "5px", marginRight: "10px" }}
                // onChange={(e) => setEnd(e.target.value)}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  const adjustedTime = new Date(newDate.getTime() - (newDate.getTimezoneOffset() * 60000));// const adjustedStart = new Date(newDate);

                  // newDate.setHours(newDate.getHours() + 9);
                  // newDate.setMinutes(newDate.getMinutes() - newDate.getTimezoneOffset());
                  setSelectedDates({ ...selectedDates, end: adjustedTime });
                }}
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

      {/* <Calendar */}
      {isLoading ? (
        <h1 class="text-blue-600">データ取得中。少しお待ち下さい...😀</h1>
      ) : (
        <DragAndDropCalendar
          localizer={localizer}
          events={events}
          // events={eventsForCopy}
          style={{ height: 1600 }}
          min={min}
          max={max}
          messages={{
            today: '今日',
            previous: '前へ',
            next: '次へ',
            month: '月',
            week: '週',
            day: '日',
            agenda: '予定'
          }}
          startAccessor="start"
          endAccessor="end"
          // onClick={handleSelectEvent(event)}
          // onSelectEvent={(event) => setSelectedEvent(event)}
          onSelectEvent={handleSelectEvent}
          components={{
            event: EventComponent // Use the custom EventComponent to render events
          }}
          // onSelectSlot={window.alert('Hello!')}
          onSelectSlot={(slotInfo) => {
            const { start, end } = slotInfo;

            // const adjustedStart = localizerFnc.startOfDay(start);
            // const adjustedEnd = localizerFnc.endOfDay(end);
            const adjustedStart = new Date(start.getTime() - (start.getTimezoneOffset() * 60000));
            const adjustedEnd = new Date(end.getTime() - (end.getTimezoneOffset() * 60000));

            // adjustedStart.setHours(adjustedStart.getHours() + 9);
            // adjustedEnd.setHours(adjustedEnd.getHours() + 9);

            setShowPopup(true);
            setSelectedDates({ start: adjustedStart, end: adjustedEnd });
            setSelectedEvent({
              title: "",
              doushi: "",
              onkyo: "",
              shikai: "",
              uketsuke: "",
              comment: "",
            });
            // setSelectedDates({ start, end });
            // Handle the selection of an empty slot here
            // You can open a popup or modal with the start and end dates pre-filled in input boxes
            // You can use the start and end dates to pre-fill the input boxes in your popup
            console.log('Selected slot:', start, end);
          }}
          eventPropGetter={(event) => {
            if (event.title === "「復活の祈り」") {
              return {
                style: {
                  color: 'white', // This sets the text color to red
                }
              };
            }
            if (event.title === "埼玉本部行事") {
              return {
                style: {
                  backgroundColor: 'pink', // This sets the text color to red
                }
              };
            }
            if (event.title === "支部長会議") {
              return {
                style: {
                  backgroundColor: 'pink', // This sets the text color to red
                }
              };
            }
            if (event.title === "「心の修行」") {
              return {
                style: {
                  backgroundColor: 'purple', // This sets the text color to red
                }
              };
            }
            if (event.title === "外部講師セミナー") {
              return {
                style: {
                  backgroundColor: 'green', // This sets the text color to red
                }
              };
            }
            if (event.title === "その他") {
              return {
                style: {
                  backgroundColor: 'brown', // This sets the text color to red
                }
              };
            }
            if (event.title === "発展・繁栄系祈願祭") {
              return {
                style: {
                  backgroundColor: 'orange', // This sets the text color to red
                }
              };
            }
            if (event.title === "降魔・病気平癒系祈願祭") {
              return {
                style: {
                  backgroundColor: 'orange', // This sets the text color to red
                }
              };
            }
            if (event.title === "新年大祭") {
              return {
                style: {
                  backgroundColor: 'orange', // This sets the text color to red
                }
              };
            }
            if (event.title === "いま学びたい御法話セミナー") {
              return {
                style: {
                  backgroundColor: 'navy', // This sets the text color to red
                }
              };
            }
            if (event.title === "「未来創造ミーティング」") {
              return {
                style: {
                  backgroundColor: 'gray', // This sets the text color to red
                }
              };
            }
            if (event.title === "伝道ミーティング") {
              return {
                style: {
                  backgroundColor: 'gray', // This sets the text color to red
                }
              };
            }
            if (event.title === "植福ミーティング") {
              return {
                style: {
                  backgroundColor: 'gray', // This sets the text color to red
                }
              };
            }
            if (event.title === "PDCAミーティング") {
              return {
                style: {
                  backgroundColor: 'gray', // This sets the text color to red
                }
              };
            }
            return {}; // Return empty for events that don't match
          }}
          showMultiDayTimes
          popup={true}
          selectable
          resizable
          scrollToTime={scrollToTime}
          onEventResize={resizeEvent}
          // events={myEvents}
          // onEventDrop={moveEvent}
          // showMultiDayTimes
          // defaultDate={defaultDate}
          // views={views}
          // events={myEvents}
          onEventDrop={handleEventCopy}
          // resourceIdAccessor="resourceId"
          // resources={resourceMap}
          // resourceTitleAccessor="resourceTitle"

          onEventCopy={handleEventCopy}
          onEventPaste={handleEventPaste}
        />
      )}
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
              value={selectedEvent.title || ''}
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
            <label>開始時間：{selectedEvent?.start ? selectedEvent.start.toLocaleString('ja-JP') : ""}</label>
            {/* <label>開始時間：{selectedEvent?.start?.toString('ja-JP') ?? ""}</label> */}
            <input
              type="datetime-local"
              // value={start}
              style={{ width: "70%", height: "30px", marginTop: "5px", marginRight: "10px" }}
              onChange={(e) => {
                console.log('New start time:', e.target.value);
                setStart(e.target.value);
                setIsStartModified(true);
              }}
              required
            />
            <br /> {/* 改行を挿入 */}
            <label>終了時間：{selectedEvent?.end ? selectedEvent.end.toLocaleString('ja-JP') : ""}</label>
            {/* <label>終了時間：{selectedEvent?.end?.toString() ?? ""}</label> */}
            <input
              type="datetime-local"
              // value={end}
              style={{ width: "70%", height: "30px", marginTop: "5px", marginRight: "10px" }}
              onChange={(e) => {
                setEnd(e.target.value)
                setIsEndModified(true);
              }}
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
              value={selectedEvent.doushi || ''}
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
              value={selectedEvent.onkyo || ''}
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
              value={selectedEvent.shikai || ''}
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
              value={selectedEvent.uketsuke || ''}
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
              onClick={handleEditEvent}>
              行事の修正
            </button>
            <button
              onClick={handleDeleteEvent}
              style={{ width: "30%", height: "30px", marginTop: "10px", marginRight: "10px", marginBottom: "20px" }}
            >行事の削除
            </button>
            {/* <br /> */}
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