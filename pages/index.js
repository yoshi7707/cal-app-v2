import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import 'moment/locale/ja';
moment.locale('ja');
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
const DragAndDropCalendar = withDragAndDrop(Calendar)

import SearchPrayerForResurrection from './searchPrayerForResurrection';
import SearchJochu from './searchJochu';

import { dateFnsLocalizer } from 'react-big-calendar';
import { setHours, setMinutes, parse, getDay, startOfWeek, format } from 'date-fns';
import { ja } from 'date-fns/locale';

// Helper function to format date to 'yyyy-MM-ddTHH:mm'
const formatToLocalDateTimeString = (date) => {
    if (!date) return '';
    const d = new Date(date);
    // Adjust for timezone offset to display correctly in the input
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localDate = new Date(d.getTime() - tzOffset);
    return localDate.toISOString().slice(0, 16);
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { locale: ja }),
    getDay,
    locales: { ja },
});

const formats = {
    weekdayFormat: (date, culture, localizer) => localizer.format(date, 'eee', culture),
};

const EventComponent = ({ event }) => {
    return (
        <div>
            <strong style={{ fontSize: '12px' }}>{event.title}</strong>
            {event.doushi && event.doushi !== 'N/A' && (
                <p style={{ fontSize: '12px', margin: 0 }}>{`導)${event.doushi}`}</p>
            )}
            {event.onkyo && event.onkyo !== 'N/A' && (
                <p style={{ fontSize: '12px', margin: 0 }}>{`音)${event.onkyo}`}</p>
            )}
        </div>
    );
};

const MyCalendar = () => {
    const [events, setEvents] = useState([]);
    const [view, setView] = useState('month');
    const [filter, setFilter] = useState('');
    const [shikaiOnly, setShikaiOnly] = useState(false); // For "常駐" filter
    const [isLoading, setIsLoading] = useState(true);

    // State for popups
    const [showNewEventPopup, setShowNewEventPopup] = useState(false);
    const [showEditEventPopup, setShowEditEventPopup] = useState(false);

    // State for the event being created or edited
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedDates, setSelectedDates] = useState({ start: null, end: null });

    // State for settings lists
    const [doushis, setDoushis] = useState([]);
    const [onkyos, setOnkyos] = useState([]);
    const [shikais, setShikais] = useState([]);
    const [presetEvents, setPresetEvents] = useState([]);

    // State for settings modal
    const [showSettings, setShowSettings] = useState(false);
    const [newItemType, setNewItemType] = useState('doushi');
    const [newItemName, setNewItemName] = useState('');
    const [newItemLineId, setNewItemLineId] = useState('');
    const [isSavingItem, setIsSavingItem] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    const min = setHours(setMinutes(new Date(), 0), 8); // 8:00
    const max = setHours(setMinutes(new Date(), 0), 22); // 22:00

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const settingsRes = await fetch('/api/settings');
            const settingsData = await settingsRes.json();
            if (settingsData && settingsData.items) {
                setDoushis(settingsData.items.doushi || []);
                setOnkyos(settingsData.items.onkyo || []);
                setShikais(settingsData.items.shikai || []);
                setPresetEvents(settingsData.items.event || []);
            }

            const eventsRes = await fetch('/api/event');
            const eventsList = await eventsRes.json();
            if (Array.isArray(eventsList)) {
                const mapped = eventsList.map(ev => ({
                    id: ev.id,
                    title: ev.eventName,
                    start: ev.startTime ? new Date(ev.startTime) : new Date(),
                    end: ev.endTime ? new Date(ev.endTime) : new Date(),
                    date: ev.date,
                    doushi: ev.doushi || '',
                    onkyo: ev.onkyo || '',
                    shikai: ev.shikai || '',
                    comment: ev.comment || ''
                }));
                setEvents(mapped);
            }
        } catch (err) {
            console.error("Failed to load data", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const filteredEvents = useMemo(() => {
        let tempEvents = events;
        if (filter) {
            tempEvents = tempEvents.filter(e => e.title === filter);
        }
        if (shikaiOnly) {
            tempEvents = tempEvents.filter(e => e.shikai && e.shikai !== 'N/A');
        }
        return tempEvents;
    }, [events, filter, shikaiOnly]);

    const handleSelectEvent = (event) => {
        setSelectedEvent(event);
        setShowEditEventPopup(true);
    };

    const handleSelectSlot = (slotInfo) => {
        const { start, end } = slotInfo;
        setSelectedDates({ start, end });
        setSelectedEvent({
            title: "",
            doushi: "",
            onkyo: "",
            shikai: "",
            comment: "",
            start,
            end,
        });
        setShowNewEventPopup(true);
    };

    const handleEventChange = (field, value) => {
        setSelectedEvent(prev => ({ ...prev, [field]: value }));
    };

    const handleNewEventSubmit = async (e) => {
        e.preventDefault();

        if (selectedDates.end <= selectedDates.start) {
            alert('終了時間が過去になっていますので選び直してください。');
            return;
        }

        const duration = selectedDates.end.getTime() - selectedDates.start.getTime();
        const fourHoursInMillis = 4 * 60 * 60 * 1000;
        if (duration > fourHoursInMillis) {
            if (!window.confirm('時間が４時間以上ですが、それで良いですか？')) {
                return;
            }
        }

        const newEv = {
            eventName: selectedEvent.title,
            startTime: selectedDates.start.toISOString(),
            endTime: selectedDates.end.toISOString(),
            date: selectedDates.start.toISOString().split('T')[0],
            doushi: selectedEvent.doushi || 'N/A',
            onkyo: selectedEvent.onkyo || 'N/A',
            shikai: selectedEvent.shikai || 'N/A',
            comment: selectedEvent.comment || ''
        };

        try {
            const response = await fetch('/api/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEv)
            });

            if (response.ok) {
                await fetchAllData(); // Refresh all data
                setShowNewEventPopup(false);
            } else {
                alert('Failed to create event.');
            }
        } catch (err) {
            alert('Error creating event.');
        }
    };

    const handleEditEvent = async (e) => {
        e.preventDefault();
        if (!selectedEvent || !selectedEvent.id) return;

        if (selectedEvent.end <= selectedEvent.start) {
            alert('終了時間が過去になっていますので選び直してください。');
            return;
        }

        const duration = selectedEvent.end.getTime() - selectedEvent.start.getTime();
        const fourHoursInMillis = 4 * 60 * 60 * 1000;
        if (duration > fourHoursInMillis) {
            if (!window.confirm('時間が４時間以上ですが、それで良いですか？')) {
                return;
            }
        }

        const updateData = {
            eventName: selectedEvent.title,
            startTime: selectedEvent.start.toISOString(),
            endTime: selectedEvent.end.toISOString(),
            date: selectedEvent.start.toISOString().split('T')[0],
            doushi: selectedEvent.doushi || 'N/A',
            onkyo: selectedEvent.onkyo || 'N/A',
            shikai: selectedEvent.shikai || 'N/A',
            comment: selectedEvent.comment || ''
        };

        try {
            const response = await fetch(`/api/event?id=${selectedEvent.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });

            if (response.ok) {
                await fetchAllData();
                setShowEditEventPopup(false);
            } else {
                alert('Failed to update event.');
            }
        } catch (error) {
            alert('Error updating event.');
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent || !selectedEvent.id) return;

        if (window.confirm(`Are you sure you want to delete "${selectedEvent.title}"?`)) {
            try {
                const response = await fetch(`/api/event?id=${selectedEvent.id}`, {
                    method: 'DELETE',
                });
                if (response.ok) {
                    await fetchAllData();
                    setShowEditEventPopup(false);
                } else {
                    alert('Failed to delete event.');
                }
            } catch (error) {
                alert('Error deleting event.');
            }
        }
    };

    const handleAddSetting = async (e) => {
        e.preventDefault();
        if (!newItemName.trim()) return setStatusMsg('Name required');
        setIsSavingItem(true);
        setStatusMsg('');
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: newItemType,
                    name: newItemName.trim(),
                    lineId: newItemType !== 'event' ? newItemLineId.trim() : undefined,
                })
            });
            if (res.ok) {
                setStatusMsg('Saved');
                setNewItemName('');
                setNewItemLineId('');
                await fetchAllData();
            } else {
                const json = await res.json();
                setStatusMsg(json.error || 'Failed');
            }
        } catch (err) {
            setStatusMsg('Error');
        } finally {
            setIsSavingItem(false);
        }
    };

    return (
        <div style={{ textAlign: 'center' }}>
            <br />
            <h2>＜越谷支部行事一覧＞</h2>
            <button onClick={() => setShowNewEventPopup(true)} style={{
                width: '120px',
                height: '30px',
                marginTop: '5px',
                marginBottom: '20px',
                marginRight: '10px',
                borderRadius: '10px',
                backgroundColor: 'green',
                color: 'white',
                border: 'none',
                cursor: 'pointer'
            }}>新規行事入力</button>

            {isLoading ? (
                <h2>データ取得中...😃</h2>
            ) : (
                <DragAndDropCalendar
                    localizer={localizer}
                    formats={formats}
                    events={filteredEvents}
                    style={{ height: 1600 }}
                    min={min}
                    max={max}
                    messages={{ today: '今日', previous: '◀️', next: '▶️', month: '月', week: '週', day: '日', agenda: '予定' }}
                    onSelectEvent={handleSelectEvent}
                    onSelectSlot={handleSelectSlot}
                    components={{ event: EventComponent }}
                    selectable
                    popup
                    eventPropGetter={(event) => {
                        if (event.title === "「復活の祈り」") {
                            return {
                                style: {
                                    backgroundColor: 'red',
                                }
                            };
                        }
                        if (event.title === "埼玉本部行事") {
                            return {
                                style: {
                                    backgroundColor: 'pink',
                                }
                            };
                        }
                        if (event.title === "支部長会議") {
                            return {
                                style: {
                                    backgroundColor: 'pink',
                                }
                            };
                        }
                        if (event.title === "「心の修行」") {
                            return {
                                style: {
                                    backgroundColor: 'purple',
                                }
                            };
                        }
                        if (event.title === "外部講師セミナー") {
                            return {
                                style: {
                                    backgroundColor: 'green',
                                }
                            };
                        }
                        if (event.title === "その他") {
                            return {
                                style: {
                                    backgroundColor: 'brown',
                                }
                            };
                        }
                        if (event.title === "発展・繁栄系祈願祭") {
                            return {
                                style: {
                                    backgroundColor: 'orange',
                                }
                            };
                        }
                        if (event.title === "降魔・病気平癒系祈願祭") {
                            return {
                                style: {
                                    backgroundColor: 'orange',
                                }
                            };
                        }
                        if (event.title === "新年大祭") {
                            return {
                                style: {
                                    backgroundColor: 'orange',
                                }
                            };
                        }
                        if (event.title === "いま学びたい御法話セミナー") {
                            return {
                                style: {
                                    backgroundColor: 'navy',
                                }
                            };
                        }
                        if (event.title === "「未来創造ミーティング」") {
                            return {
                                style: {
                                    backgroundColor: 'gray',
                                }
                            };
                        }
                        if (event.title === "伝道ミーティング") {
                            return {
                                style: {
                                    backgroundColor: 'gray',
                                }
                            };
                        }
                        if (event.title === "植福ミーティング") {
                            return {
                                style: {
                                    backgroundColor: 'gray',
                                }
                            };
                        }
                        if (event.title === "PDCAミーティング") {
                            return {
                                style: {
                                    backgroundColor: 'gray',
                                }
                            };
                        }
                        return {};
                    }}
                />
            )}
<br />
            <SearchPrayerForResurrection events={events} />
            <SearchJochu events={events} />

            {/* New Event Popup */}
            {showNewEventPopup && (
                <div className="popup">
                    <div className="popup-inner">
                        <h1>新規行事入力</h1>
                        <form onSubmit={handleNewEventSubmit}>
                            <label>行事:</label>
                            <select onChange={(e) => handleEventChange('title', e.target.value)} required>
                                <option value="">行事選択</option>
                                {presetEvents.map((name, i) => <option key={i} value={name}>{name}</option>)}
                            </select>
                            <br />
                            <label>開始時間:</label>
                            <input type="datetime-local" value={formatToLocalDateTimeString(selectedDates.start)} onChange={(e) => setSelectedDates(p => ({ ...p, start: new Date(e.target.value) }))} required />
                            <br />
                            <label>終了時間:</label>
                            <input type="datetime-local" value={formatToLocalDateTimeString(selectedDates.end)} onChange={(e) => setSelectedDates(p => ({ ...p, end: new Date(e.target.value) }))} required />
                            <br />
                            <label>導師:</label>
                            <select onChange={(e) => handleEventChange('doushi', e.target.value)} >
                                <option value="">導師選択</option>
                                {doushis.map((d, i) => <option key={i} value={d.name}>{d.name}</option>)}
                            </select>
                            <br />
                            <label>音響:</label>
                            <select onChange={(e) => handleEventChange('onkyo', e.target.value)}>
                                <option value="">音響選択</option>
                                {onkyos.map((o, i) => <option key={i} value={o.name}>{o.name}</option>)}
                            </select>
                            <br />
                            <label>常駐:</label>
                            <select onChange={(e) => handleEventChange('shikai', e.target.value)}>
                                <option value="">常駐選択</option>
                                {shikais.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
                            </select>
                            <br />
                            <label>備考:</label>
                            <input type="text" onChange={(e) => handleEventChange('comment', e.target.value)} placeholder="備考" />
                            <br />
                            <button type="submit">行事の追加</button>
                            <button type="button" onClick={() => setShowNewEventPopup(false)}>キャンセル</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Event Popup */}
            {showEditEventPopup && selectedEvent && (
                <div className="popup">
                    <div className="popup-inner">
                        <h2>行事の変更・削除</h2>
                        <form onSubmit={handleEditEvent}>
                            <label>行事:</label>
                            <select value={selectedEvent.title} onChange={(e) => handleEventChange('title', e.target.value)} required>
                                <option value="">行事選択</option>
                                {presetEvents.map((name, i) => <option key={i} value={name}>{name}</option>)}
                            </select>
                            <br />
                            <label>開始時間:</label>
                            <input type="datetime-local" value={formatToLocalDateTimeString(selectedEvent.start)} onChange={(e) => handleEventChange('start', new Date(e.target.value))} required />
                            <br />
                            <label>終了時間:</label>
                            <input type="datetime-local" value={formatToLocalDateTimeString(selectedEvent.end)} onChange={(e) => handleEventChange('end', new Date(e.target.value))} required />
                            <br />
                            <label>導師:</label>
                            <select value={selectedEvent.doushi} onChange={(e) => handleEventChange('doushi', e.target.value)} required>
                                <option value="">導師選択</option>
                                {doushis.map((d, i) => <option key={i} value={d.name}>{d.name}</option>)}
                            </select>
                            <br />
                            <label>音響:</label>
                            <select value={selectedEvent.onkyo} onChange={(e) => handleEventChange('onkyo', e.target.value)}>
                                <option value="">音響選択</option>
                                {onkyos.map((o, i) => <option key={i} value={o.name}>{o.name}</option>)}
                            </select>
                            <br />
                            <label>常駐:</label>
                            <select value={selectedEvent.shikai} onChange={(e) => handleEventChange('shikai', e.target.value)}>
                                <option value="">常駐選択</option>
                                {shikais.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
                            </select>
                            <br />
                            <label>コメント:</label>
                            <input type="text" value={selectedEvent.comment} onChange={(e) => handleEventChange('comment', e.target.value)} />
                            <br />
                            <button type="submit">行事の修正</button>
                            <button type="button" onClick={handleDeleteEvent}>行事の削除</button>
                            <button type="button" onClick={() => setShowEditEventPopup(false)}>キャンセル</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            <div style={{ position: 'fixed', right: 12, top: 12, zIndex: 1000 }}>
                <button onClick={() => setShowSettings(true)} title="Settings">⚙️</button>
            </div>
            {showSettings && (
                <div className="popup" onClick={() => setShowSettings(false)}>
                    <div className="popup-inner" onClick={(e) => e.stopPropagation()}>
                        <h3>Settings — Add item</h3>
                        <form onSubmit={handleAddSetting}>
                            <label>Type:</label>
                            <select value={newItemType} onChange={e => setNewItemType(e.target.value)}>
                                <option value="doushi">doushi (導師)</option>
                                <option value="onkyo">onkyo (音響)</option>
                                <option value="shikai">shikai (常駐)</option>
                                <option value="event">event (preset event)</option>
                            </select>
                            <br />
                            <label>Name:</label>
                            <input value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                            <br />
                            {newItemType !== 'event' && (
                                <>
                                    <label>LINE ID:</label>
                                    <input value={newItemLineId} onChange={e => setNewItemLineId(e.target.value)} placeholder="(Optional)" />
                                    <br />
                                </>
                            )}
                            <button type="submit" disabled={isSavingItem}>Add</button>
                            <button type="button" onClick={() => setShowSettings(false)}>Close</button>
                        </form>
                        <p><strong>Status:</strong> {statusMsg}</p>
                        <hr />
                        <h4>Current lists</h4>
                        <div>
                            <div><strong>doushi</strong><ul>{doushis.map(d => <li key={d.name}>{d.name} {d.lineId && `(${d.lineId})`}</li>)}</ul></div>
                            <div><strong>onkyo</strong><ul>{onkyos.map(o => <li key={o.name}>{o.name} {o.lineId && `(${o.lineId})`}</li>)}</ul></div>
                            <div><strong>shikai (常駐)</strong><ul>{shikais.map(s => <li key={s.name}>{s.name} {s.lineId && `(${s.lineId})`}</li>)}</ul></div>
                            <div><strong>preset events</strong><ul>{presetEvents.map(e => <li key={e}>{e}</li>)}</ul></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyCalendar;