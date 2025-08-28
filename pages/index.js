import React, { useEffect, useState } from 'react';
import { Calendar, momentLocalizer, Views, DateLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import 'moment/locale/ja';
moment.locale('ja');
import * as dates from '../react-big-calendar/src/utils/dates'
import withDragAndDrop from '../react-big-calendar/src/addons/dragAndDrop'
const DragAndDropCalendar = withDragAndDrop(Calendar)

import SearchComponent from './searchComponent';
import SearchPrayerForResurrection from './searchPrayerForResurrection';

import { dateFnsLocalizer } from 'react-big-calendar';
import dateFns from 'date-fns';
// import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";

import { setHours, setMinutes } from 'date-fns';

const localizerFnc = dateFnsLocalizer({
  dateFns,
  format: 'yyyy/MM/dd',
  parse,
  startOfWeek: (start) => new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0),
  getDay,
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
  // lists loaded from DB for selection
  const [doushis, setDoushis] = useState([]);
  const [onkyos, setOnkyos] = useState([]);
  const [shikais, setShikais] = useState([]);
  const [presetEvents, setPresetEvents] = useState([]);

  // settings UI state
  const [showSettings, setShowSettings] = useState(false);
  const [newItemType, setNewItemType] = useState('doushi');
  const [newItemName, setNewItemName] = useState('');
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // popup / selection state (added to fix missing handlers)
  const [showPopup, setShowPopup] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [selectedDates, setSelectedDates] = useState({ start: null, end: null });
  const [selectedEvent, setSelectedEvent] = useState({
    title: '',
    doushi: '',
    onkyo: '',
    shikai: '',
    uketsuke: '',
    comment: '',
    start: null,
    end: null,
  });
  const [isStartModified, setIsStartModified] = useState(false);
  const [isEndModified, setIsEndModified] = useState(false);

  const scrollToTime = new Date();
  const resizeEvent = () => {};

  useEffect(() => {
    // load settings lists on mount
    const loadSettings = fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data && data.items) {
          setDoushis(data.items.doushi || []);
          setOnkyos(data.items.onkyo || []);
          setShikais(data.items.shikai || []);
          setPresetEvents(data.items.event || []);
        }
      });

    // load existing events from DB
    const loadEvents = fetch('/api/event')
      .then(r => r.json())
      .then(list => {
        if (Array.isArray(list)) {
          const mapped = list.map(ev => ({
            id: ev.id, // Preserve the ID for deletion
            title: ev.eventName,
            start: ev.startTime ? new Date(ev.startTime) : (ev.date ? new Date(ev.date) : new Date()),
            end: ev.endTime ? new Date(ev.endTime) : new Date(),
            doushi: ev.doushi || '',
            onkyo: ev.onkyo || '',
            shikai: ev.shikai || '',
            uketsuke: ev.uketsuke || '',
            comment: ev.comment || ''
          }));
          setEvents(mapped);
        }
      });

    Promise.allSettled([loadSettings, loadEvents])
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  // Add keyboard event handler for closing settings modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showSettings) {
        setShowSettings(false);
        setStatusMsg('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSettings]);

  async function refreshSettings() {
    const r = await fetch('/api/settings');
    const data = await r.json();
    if (data && data.items) {
      setDoushis(data.items.doushi || []);
      setOnkyos(data.items.onkyo || []);
      setShikais(data.items.shikai || []);
      setPresetEvents(data.items.event || []);
    }
  }

  async function handleAddSetting(e) {
    e.preventDefault();
    if (!newItemName.trim()) return setStatusMsg('Name required');
    setIsSavingItem(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newItemType, name: newItemName.trim() })
      });
      const json = await res.json();
      if (json.ok) {
        setStatusMsg('Saved');
        setNewItemName('');
        await refreshSettings();
      } else {
        setStatusMsg(json.error || json.message || 'Failed');
      }
    } catch (err) {
      console.error(err);
      setStatusMsg('Error');
    } finally {
      setIsSavingItem(false);
    }
  }

  function handleOpenPopup() {
    const now = new Date();
    setShowPopup(true);
    setSelectedDates({ start: now, end: new Date(now.getTime() + 60 * 60 * 1000) });
    setSelectedEvent({
      title: '',
      doushi: '',
      onkyo: '',
      shikai: '',
      uketsuke: '',
      comment: '',
      start: now,
      end: new Date(now.getTime() + 60 * 60 * 1000),
    });
  }

  function handleClosePopup() {
    setShowPopup(false);
  }

  function handleEventChange(field, e) {
    const value = e && e.target ? e.target.value : e;
    setSelectedEvent(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const startDate = selectedDates.start || selectedEvent.start || new Date();
    const endDate = selectedDates.end || selectedEvent.end || new Date(Date.now() + 3600000);
    const newEv = {
      title: selectedEvent.title,
      start: startDate,
      end: endDate,
      doushi: selectedEvent.doushi,
      onkyo: selectedEvent.onkyo,
      shikai: selectedEvent.shikai,
      uketsuke: selectedEvent.uketsuke,
      comment: selectedEvent.comment,
    };

    // Persist to backend
    try {
      const response = await fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: newEv.title,
          date: startDate.toISOString(),
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          doushi: newEv.doushi || '',
          onkyo: newEv.onkyo || '',
          shikai: newEv.shikai || '',
          uketsuke: newEv.uketsuke || '',
          comment: newEv.comment || ''
        })
      });

      if (response.ok) {
        const createdEvent = await response.json();
        // Add the created event with ID to local state
        const eventWithId = {
          ...newEv,
          id: createdEvent.id
        };
        setEvents(prev => [...prev, eventWithId]);
        console.log('Event created successfully');
      } else {
        console.error('Failed to create event');
        alert('Failed to create event. Please try again.');
      }
    } catch (err) {
      console.error('Failed to save event', err);
      alert('Error creating event. Please try again.');
    } finally {
      setShowPopup(false);
    }
  }

  function handleSelectEvent(ev) {
    // invoked when user clicks an event in the calendar
    setSelectedEvent(ev);
    setIsPopupVisible(true);
  }

  async function handleEditEvent(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!selectedEvent.id) {
      console.error('No event ID found for editing');
      alert('Cannot edit event: No event ID found');
      return;
    }

    try {
      // Prepare the update data
      const updateData = {
        eventName: selectedEvent.title,
        startTime: selectedEvent.start.toISOString(),
        endTime: selectedEvent.end.toISOString(),
        doushi: selectedEvent.doushi || '',
        onkyo: selectedEvent.onkyo || '',
        shikai: selectedEvent.shikai || '',
        uketsuke: selectedEvent.uketsuke || '',
        comment: selectedEvent.comment || ''
      };

      // Make API call to update the event
      const response = await fetch(`/api/event?id=${selectedEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        // Update local state only after successful API call
        setEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? selectedEvent : ev));
        setIsPopupVisible(false);
        console.log('Event updated successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to update event:', errorData);
        alert('Failed to update event. Please try again.');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Error updating event. Please try again.');
    }
  }

  async function handleDeleteEvent(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!selectedEvent.id) {
      console.error('No event ID found for deletion');
      alert('Cannot delete event: No event ID found');
      return;
    }

    // Add confirmation dialog
    const isConfirmed = window.confirm(`Are you sure you want to delete the event "${selectedEvent.title}"?`);
    if (!isConfirmed) {
      return;
    }

    try {
      // Make API call to delete the event
      const response = await fetch(`/api/event?id=${selectedEvent.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Remove from local state only after successful API call
        setEvents(prev => prev.filter(ev => ev.id !== selectedEvent.id));
        setIsPopupVisible(false);
        console.log('Event deleted successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to delete event:', errorData);
        alert('Failed to delete event. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event. Please try again.');
    }
  }

  function handleSearch() {
    /* noop for search component integration */
  }

  // Build a `data` object used throughout the component (prevents "data is not defined")
  // Values come from state lists loaded from /api/settings (presetEvents, doushis, onkyos, shikais).
  // Provide safe defaults so initial render does not crash.
  const data = {
    gyouji: presetEvents && presetEvents.length ? presetEvents : ['その他'],
    doushis: doushis || [],
    onkyos: onkyos || [],
    shikais: shikais || [],
    uketsukes: [], // add fetching/storing if you need reception staff list
  };

  // Example usage in the event creation UI:
  // when building your event creation form, use doushis/onkyos/shikais/presetEvents arrays
  // e.g. <select value={newEvent.doushi} onChange={...}>{doushis.map(d=> <option key={d}>{d}</option>)}</select>

  return (
    <div className={styles.App}>
      <h2>＜越谷支部行事一覧＞</h2>

{/* <button 
  onClick={syncWithGoogleCalendar}
  style={{
    backgroundColor: '#4285f4',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    margin: '5px'
  }}
>
  Sync with Google Calendar
</button> */}

{/* <button 
  onClick={syncToGoogleCalendar}
  style={{
    backgroundColor: '#34a853',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    margin: '5px'
  }}
>
  Sync TO Google Calendar
</button> */}

<br />
      <button
        style={{ width: "30%", height: "30px", marginTop: "10px", marginRight: "10px", marginBottom: "20px" }}
        onClick={handleOpenPopup}>
        新規行事入力
      </button>
      {/* <SearchComponent events={events} data={data} onSearch={handleSearch} /> */}
      <SearchPrayerForResurrection events={events} data={data} onSearch={handleSearch} />
      {/* <SearchComponent events={events} onSearch={handleSearch} /> */}

      {/* Event Creation Popup */}
      {showPopup && (
        <div className="popup">
          <div className="popup-inner">
            <h2>行事入力</h2>
            <form onSubmit={handleSubmit}>
              <label>行事：</label>
              <select
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
              <input
                type="datetime-local"
                value={selectedDates.start ? selectedDates.start.toISOString('ja-JP', { dateStyle: 'medium', timeStyle: 'medium' }).slice(0, 16) : ''}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  const adjustedTime = new Date(newDate.getTime() - (newDate.getTimezoneOffset() * 60000));
                  setSelectedDates({ ...selectedDates, start: adjustedTime });
                }}
                required
              />
              <br />
              <label>終了時間：{selectedDates.end ? selectedDates.end.toISOString('ja-JP', { dateStyle: 'medium', timeStyle: 'medium' }).slice(0, 16) : ''}</label>
              <input
                type="datetime-local"
                value={selectedDates.end ? selectedDates.end.toISOString('ja-JP').slice(0, 16) : ''}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  const adjustedTime = new Date(newDate.getTime() - (newDate.getTimezoneOffset() * 60000));
                  setSelectedDates({ ...selectedDates, end: adjustedTime });
                }}
                required
              />
              <br />
              <label>導師：</label>
              <select
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
                onChange={(e) => handleEventChange('onkyo', e)}
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
                onChange={(e) => handleEventChange('shikai', e)}
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
                onChange={(e) => handleEventChange('uketsuke', e)}
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
                onChange={(e) => setSelectedEvent({ ...selectedEvent, comment: e.target.value })}
                placeholder="備考"
              />
              <br />
              <button type="submit">
                行事の追加
              </button>
              <button type="button" onClick={handleClosePopup}>キャンセル</button>
            </form>
          </div>
        </div>
      )}

      {/* <Calendar */}
      {isLoading ? (
        <h2 class="text-blue-600">データ取得中、少し待ってネ...😀</h2>
      ) : (
        <DragAndDropCalendar
          localizer={localizer}
          events={showPopup || isPopupVisible ? [] : events}
          // events={eventsForCopy}
          style={{ height: 1600 }}
          min={min}
          max={max}
          messages={{
            today: '今日',
            previous: '◀️',
            next: '▶️',
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
            console.log('Selected slot:', start, end);
          }}
          eventPropGetter={(event) => {
            if (event.title === "「復活の祈り」") {
              return {
                style: {
                  backgroundColor: 'red', // This sets the text color to red
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
          }
          }
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
        // onEventDrop={handleEventCopy}
        // resourceIdAccessor="resourceId"
        // resources={resourceMap}
        // resourceTitleAccessor="resourceTitle"

        // onEventCopy={handleEventCopy}
        // onEventPaste={handleEventPaste}
        />
      )}

      {isPopupVisible && (
        <div className="popup">
          <div className="popup-inner">
            <h2>行事の追加・変更・削除</h2>
            <label>行事：{selectedEvent.title || ''}</label>
            <select
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
              onChange={(e) => {
                setEnd(e.target.value)
                setIsEndModified(true);
              }}
              required
            />
            <br />
            <label>導師：</label>
            <label>導師：{selectedEvent.doushi || ''}</label>
            <select
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
              onChange={(e) => setSelectedEvent({ ...selectedEvent, comment: e.target.value })}
              placeholder="備考"
            />
            <br />
            <button
              onClick={handleEditEvent}>
              行事の修正
            </button>
            <button
              onClick={handleDeleteEvent}
            >行事の削除
            </button>
            {/* <br /> */}
            <button
              onClick={() => setIsPopupVisible(false)}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', right: 12, top: 12, zIndex: 1000 }}>
        <button 
          onClick={() => setShowSettings(true)} 
          style={{ 
            padding: '12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '36px',
            fontWeight: '500',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {showSettings && (
        <div 
          style={{
            position: 'fixed', 
            left: 0, 
            top: 0, 
            right: 0, 
            bottom: 0,
            background: 'rgba(0,0,0,0.5)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(2px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSettings(false);
              setStatusMsg('');
            }
          }}
        >
          <div style={{ 
            width: 520, 
            background: '#fff', 
            padding: 20, 
            borderRadius: 8, 
            zIndex: 10000,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3>Settings — Add item</h3>
            <form onSubmit={handleAddSetting}>
              <div style={{ marginBottom: 8 }}>
                <label>Type: </label>
                <select value={newItemType} onChange={e => setNewItemType(e.target.value)}>
                  <option value="doushi">doushi (導師)</option>
                  <option value="onkyo">onkyo (音響)</option>
                  <option value="shikai">shikai (司会)</option>
                  <option value="event">event (preset event)</option>
                </select>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label>Name: </label>
                <input value={newItemName} onChange={e => setNewItemName(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={isSavingItem}>Add</button>
                <button type="button" onClick={() => { setShowSettings(false); setStatusMsg(''); }}>Close</button>
              </div>
            </form>

            <div style={{ marginTop: 12 }}>
              <strong>Status:</strong> {statusMsg}
            </div>

            <hr style={{ margin: '12px 0' }} />

            <div>
              <h4>Current lists</h4>
              <div style={{ display: 'flex', gap: 12 }}>
                <div>
                  <div><strong>doushi</strong></div>
                  <ul>{doushis.map(d => <li key={d}>{d}</li>)}</ul>
                </div>
                <div>
                  <div><strong>onkyo</strong></div>
                  <ul>{onkyos.map(d => <li key={d}>{d}</li>)}</ul>
                </div>
                <div>
                  <div><strong>shikai</strong></div>
                  <ul>{shikais.map(d => <li key={d}>{d}</li>)}</ul>
                </div>
                <div>
                  <div><strong>preset events</strong></div>
                  <ul>{presetEvents.map(d => <li key={d}>{d}</li>)}</ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCalendar;