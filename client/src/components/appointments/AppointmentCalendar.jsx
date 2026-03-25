/**
 * AppointmentCalendar.jsx
 * Full-featured Day/Week/Month calendar using react-big-calendar.
 * Supports drag-and-drop rescheduling, color-coded by status, and click-to-detail.
 */
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { AuthContext } from '../../context/AuthContext';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './AppointmentCalendar.css';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

// Color scheme by status
const STATUS_COLORS = {
  scheduled: { bg: '#3b82f6', fg: '#fff', border: '#2563eb' },
  completed:  { bg: '#22c55e', fg: '#fff', border: '#16a34a' },
  cancelled:  { bg: '#ef4444', fg: '#fff', border: '#dc2626' },
};

// Convert API appointment → rbc event format
const toEvent = (a) => {
  const [y, m, d] = a.appointment_date.split('-').map(Number);
  const [h, min]  = a.appointment_time.split(':').map(Number);
  const start = new Date(y, m - 1, d, h, min);
  const end   = new Date(y, m - 1, d, h, min + 30); // default 30-min slot
  return {
    id:             a.id,
    title:          a.patient_name,
    start,
    end,
    status:         a.status,
    patient_name:   a.patient_name,
    patient_phone:  a.patient_phone,
    patient_id:     a.patient_id,
    reason:         a.reason,
    appointment_date: a.appointment_date,
    appointment_time: a.appointment_time,
    resource:       a,
  };
};

/* ── Reschedule Modal ─────────────────────────────────────────────────── */
function RescheduleModal({ onClose, onSaved, authFetch, conflictData }) {
  const { event, attemptedDate } = conflictData;
  const [date, setDate] = useState(attemptedDate || moment().format('YYYY-MM-DD'));
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const ALL_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];

  const handleSave = async () => {
    if (!time) return setError('Please select a time slot.');
    setSaving(true);
    setError('');
    const r = await authFetch(`/api/appointments/${event.id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ appointment_date: date, appointment_time: time }),
    });
    const data = await r.json();
    if (!r.ok) {
      setError(data.error || 'Failed to reschedule');
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved(`✅ ${event.patient_name} rescheduled to ${date} ${time}`, { newDate: date, newTime: time, event });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 12, width: 400, maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', color: '#1e293b' }}>Slot Unavailable</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
          That slot is already booked. Please choose another available slot for <strong>{event.patient_name}</strong>.
        </p>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Available Time Slots</label>
          <select value={time} onChange={e => setTime(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, boxSizing: 'border-box' }}>
            <option value="">Select a time...</option>
            {ALL_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 16, background: '#fef2f2', padding: 8, borderRadius: 6 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !time} style={{ padding: '8px 16px', border: 'none', background: '#3b82f6', color: '#fff', borderRadius: 6, cursor: 'pointer', opacity: (saving || !time) ? 0.6 : 1, fontWeight: 500 }}>
            {saving ? 'Rescheduling...' : 'Confirm Slot'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppointmentCalendar() {
  const { authFetch, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [view, setView]     = useState(Views.MONTH);
  const [date, setDate]     = useState(new Date());
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [slotConflictEvent, setSlotConflictEvent] = useState(null);
  const [toast, setToast]   = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Compute date range to fetch based on current view
  const getRange = useCallback((d, v) => {
    const m = moment(d);
    if (v === Views.DAY)   return { from: m.format('YYYY-MM-DD'), to: m.format('YYYY-MM-DD') };
    if (v === Views.WEEK)  return { from: m.startOf('week').format('YYYY-MM-DD'), to: m.endOf('week').format('YYYY-MM-DD') };
    return { from: m.startOf('month').subtract(7, 'days').format('YYYY-MM-DD'), to: m.endOf('month').add(7, 'days').format('YYYY-MM-DD') };
  }, []);

  const fetchEvents = useCallback(async (d, v) => {
    setLoading(true);
    try {
      const { from, to } = getRange(d || date, v || view);
      const r = await authFetch(`/api/appointments?from=${from}&to=${to}&limit=500`);
      const data = await r.json();
      setEvents((data.appointments || []).map(toEvent));
    } catch (e) { /* silent */ }
    setLoading(false);
  }, [date, view, getRange, authFetch]);

  useEffect(() => { fetchEvents(date, view); }, []);

  const handleNavigate = (newDate) => { setDate(newDate); fetchEvents(newDate, view); };
  const handleView     = (newView) => { setView(newView); fetchEvents(date, newView); };

  // Drag-and-drop reschedule
  const onEventDrop = useCallback(async ({ event, start }) => {
    if (user?.role === 'staff') { showToast('Only admins can reschedule'); return; }

    const oldDateTime = moment(`${event.appointment_date}T${event.appointment_time}`);
    if (oldDateTime.isBefore(moment())) {
      showToast('Cannot reschedule past appointments');
      return;
    }

    const newDateTime = moment(start);
    if (newDateTime.isBefore(moment())) {
      showToast('Cannot reschedule to a past date/time');
      return;
    }

    const newDate = newDateTime.format('YYYY-MM-DD');
    const newTime = newDateTime.format('HH:mm');
    setRescheduling(true);
    try {
      const r = await authFetch(`/api/appointments/${event.id}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({ appointment_date: newDate, appointment_time: newTime }),
      });
      const data = await r.json();
      if (!r.ok) { 
        if (data.error === 'Slot already booked') {
            setSlotConflictEvent({ event, attemptedDate: newDate });
        } else {
            showToast(data.error || 'Reschedule failed'); 
        }
      } else {
        showToast(`✅ ${event.patient_name} rescheduled to ${newDate} ${newTime}`);
        fetchEvents(date, view);
        if (selected?.id === event.id) setSelected({ ...selected, appointment_date: newDate, appointment_time: newTime });
      }
    } catch { showToast('Reschedule failed'); }
    setRescheduling(false);
  }, [authFetch, fetchEvents, date, view, selected, user]);

  // Update appointment status from detail panel
  const updateStatus = async (id, status) => {
    await authFetch(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    fetchEvents(date, view);
    setSelected(prev => ({ ...prev, status }));
  };

  // Event style getter
  const eventStyleGetter = (event) => {
    const colors = STATUS_COLORS[event.status] || STATUS_COLORS.scheduled;
    return {
      style: {
        backgroundColor: colors.bg,
        borderLeft: `3px solid ${colors.border}`,
        color: colors.fg,
        borderRadius: '5px',
        padding: '2px 6px',
        fontSize: '12px',
        fontWeight: 500,
      },
    };
  };

  const CustomEvent = ({ event }) => (
    <div>
      <strong style={{ fontSize: 12 }}>{event.title}</strong>
      {event.appointment_time && <span style={{ fontSize: 10, opacity: 0.9, marginLeft: 4 }}>{event.appointment_time}</span>}
    </div>
  );

  return (
    <div className="cal-wrapper">
      {toast && <div className="cal-toast">{toast}</div>}
      {loading && <div className="cal-loading-bar" />}
      {rescheduling && <div className="cal-reschedule-overlay">Rescheduling…</div>}

      {/* Legend */}
      <div className="cal-legend">
        {Object.entries(STATUS_COLORS).map(([status, c]) => (
          <div key={status} className="cal-legend-item">
            <span className="cal-legend-dot" style={{ background: c.bg }} />
            <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
          </div>
        ))}
      </div>

      <DnDCalendar
        localizer={localizer}
        events={events}
        view={view}
        date={date}
        onView={handleView}
        onNavigate={handleNavigate}
        onSelectEvent={(event) => setSelected(event.resource)}
        onEventDrop={onEventDrop}
        eventPropGetter={eventStyleGetter}
        components={{ event: CustomEvent }}
        style={{ height: 620 }}
        draggableAccessor={() => user?.role !== 'staff'}
        resizable={false}
        popup
      />

      {/* Appointment Detail Side Panel */}
      {selected && (
        <div className="cal-side-panel">
          <div className="cal-panel-header">
            <h3>Appointment Details</h3>
            <button className="btn-icon" onClick={() => setSelected(null)}>✕</button>
          </div>
          <div className="cal-panel-body">
            <div className="cal-panel-name">{selected.patient_name}</div>
            <div className="cal-panel-meta">
              <span>📅 {selected.appointment_date}</span>
              <span>⏰ {selected.appointment_time}</span>
            </div>
            {selected.patient_phone && <div className="cal-panel-row"><span>📞</span> {selected.patient_phone}</div>}
            {selected.reason && <div className="cal-panel-row"><span>📋</span> {selected.reason}</div>}
            <div className="cal-panel-row">
              <span className={`badge badge-${selected.status === 'scheduled' ? 'info' : selected.status === 'completed' ? 'success' : 'gray'}`}>
                {selected.status}
              </span>
            </div>
            <div className="cal-panel-actions">
              {selected.status === 'scheduled' && <>
                <button className="btn btn-sm btn-success" onClick={() => updateStatus(selected.id, 'completed')}>✓ Mark Done</button>
                <button className="btn btn-sm btn-danger" onClick={() => updateStatus(selected.id, 'cancelled')}>✕ Cancel</button>
              </>}
              {selected.patient_id && (
                <button className="btn btn-sm btn-primary" onClick={() => navigate(`/admin/patients/${selected.patient_id}`)}>
                  👤 View Patient
                </button>
              )}
              <button className="btn btn-sm btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule on Conflict modal */}
      {slotConflictEvent && (
        <RescheduleModal
          authFetch={authFetch}
          conflictData={slotConflictEvent}
          onClose={() => setSlotConflictEvent(null)}
          onSaved={(msg, { newDate, newTime, event }) => {
            setSlotConflictEvent(null);
            fetchEvents(date, view);
            showToast(msg);
            if (selected?.id === event.id) {
              setSelected({ ...selected, appointment_date: newDate, appointment_time: newTime });
            }
          }}
        />
      )}
    </div>
  );
}
