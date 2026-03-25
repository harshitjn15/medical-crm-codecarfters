/**
 * CalendarPage.jsx
 * Dedicated full-screen calendar page with premium SaaS design.
 * Inspired by the reference images — left "Today's visits" sidebar, month/week/day views,
 * doctor filter, status filter, quick-add appointment modal, drag-and-drop.
 */
import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { AuthContext } from '../../context/AuthContext';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './CalendarPage.css';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

/* ── Constants ─────────────────────────────────────────────────────────── */
const STATUS = {
  scheduled: { label: 'Scheduled', color: 'var(--primary)', bg: 'rgba(15,76,117,0.1)', border: 'var(--primary-light)' },
  completed:  { label: 'Completed', color: 'var(--success)', bg: 'var(--success-bg)', border: '#86efac' },
  cancelled:  { label: 'Cancelled', color: 'var(--danger)', bg: 'var(--danger-bg)', border: '#fca5a5' },
  pending:    { label: 'Pending',   color: 'var(--warning)', bg: 'var(--warning-bg)', border: '#fcd34d' },
};

const ALL_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];
const VIEW_LABELS = { month: 'Month', week: 'Week', day: 'Day' };

/* ── Helpers ───────────────────────────────────────────────────────────── */
const toEvent = (a) => {
  const [y, m, d] = (a.appointment_date || '2000-01-01').split('-').map(Number);
  const [h, min]  = (a.appointment_time || '09:00').split(':').map(Number);
  const start = new Date(y, m - 1, d, h, min);
  const end   = new Date(y, m - 1, d, h, min + 30);
  return { ...a, id: a.id, title: a.patient_name, start, end, resource: a };
};

const getRange = (d, v) => {
  const m = moment(d);
  if (v === 'day')  return { from: m.format('YYYY-MM-DD'), to: m.format('YYYY-MM-DD') };
  if (v === 'week') return { from: m.clone().startOf('isoWeek').format('YYYY-MM-DD'), to: m.clone().endOf('isoWeek').format('YYYY-MM-DD') };
  return { from: m.clone().startOf('month').subtract(7,'days').format('YYYY-MM-DD'), to: m.clone().endOf('month').add(7,'days').format('YYYY-MM-DD') };
};

const getTodayStr = () => moment().format('YYYY-MM-DD');

/* ── Custom toolbar ────────────────────────────────────────────────────── */
function CustomToolbar({ date, view, onNavigate, onView, onAddClick }) {
  const label = view === 'day'
    ? moment(date).format('dddd, MMMM D YYYY')
    : view === 'week'
      ? `${moment(date).startOf('isoWeek').format('MMM D')} – ${moment(date).endOf('isoWeek').format('MMM D, YYYY')}`
      : moment(date).format('MMMM YYYY');

  return (
    <div className="cp-toolbar">
      <div className="cp-toolbar-left">
        <button className="cp-nav-btn" onClick={() => onNavigate('PREV')}>‹</button>
        <button className="cp-nav-btn cp-nav-today" onClick={() => onNavigate('TODAY')}>Today</button>
        <button className="cp-nav-btn" onClick={() => onNavigate('NEXT')}>›</button>
        <span className="cp-toolbar-label">{label}</span>
      </div>
      <div className="cp-toolbar-right">
        {Object.keys(VIEW_LABELS).map(v => (
          <button
            key={v}
            className={`cp-view-btn ${view === v ? 'active' : ''}`}
            onClick={() => onView(v)}
          >{VIEW_LABELS[v]}</button>
        ))}
        <button className="cp-add-btn" onClick={onAddClick}>+ Schedule Visit</button>
      </div>
    </div>
  );
}

/* ── Custom month event ─────────────────────────────────────────────────── */
function MonthEvent({ event }) {
  const s = STATUS[event.status] || STATUS.scheduled;
  return (
    <div className="cp-month-event" style={{ background: s.bg, borderLeft: `3px solid ${s.border}`, color: s.color }}>
      <span className="cp-event-avatar">{event.patient_name?.[0]?.toUpperCase()}</span>
      <span className="cp-event-name">{event.patient_name}</span>
      {event.appointment_time && <span className="cp-event-time">{event.appointment_time}</span>}
    </div>
  );
}

/* ── Custom week/day event ──────────────────────────────────────────────── */
function WeekEvent({ event }) {
  const s = STATUS[event.status] || STATUS.scheduled;
  return (
    <div className="cp-week-event" style={{ background: s.bg, borderLeft: `4px solid ${s.color}`, color: s.color }}>
      <div className="cp-week-event-time">{event.appointment_time}</div>
      <div className="cp-week-event-name">{event.patient_name}</div>
      {event.reason && <div className="cp-week-event-reason">{event.reason}</div>}
    </div>
  );
}

/* ── Add Appointment Modal ──────────────────────────────────────────────── */
function AddAppointmentModal({ onClose, onSaved, authFetch, prefillDate }) {
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({
    patient_name: '', patient_phone: '', patient_email: '',
    appointment_date: prefillDate || getTodayStr(),
    appointment_time: '09:00', reason: '',
    existing_patient_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [mode, setMode]     = useState('new'); // 'new' | 'existing'

  useEffect(() => {
    authFetch('/api/patients?limit=200').then(r => r.json()).then(d => setPatients(d.patients || []));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (mode === 'existing' && !form.existing_patient_id) return setError('Select a patient');
    if (!form.appointment_date || !form.appointment_time) return setError('Date and time required');
    setSaving(true); setError('');

    const patient = mode === 'existing'
      ? patients.find(p => p.id === form.existing_patient_id)
      : null;

    const payload = {
      patient_name:  patient?.name  || form.patient_name,
      patient_phone: patient?.phone || form.patient_phone,
      patient_email: patient?.email || form.patient_email,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time,
      reason: form.reason,
      patient_id: patient?.id || undefined,
    };

    if (!payload.patient_name) { setError('Patient name required'); setSaving(false); return; }

    const r = await authFetch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error || 'Failed to book appointment'); setSaving(false); return; }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="cp-modal-overlay" onClick={onClose}>
      <div className="cp-modal" onClick={e => e.stopPropagation()}>
        <div className="cp-modal-header">
          <h2>Schedule a Visit</h2>
          <button className="cp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cp-modal-body">
          {/* Patient mode toggle */}
          <div className="cp-mode-toggle">
            <button className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}>New Patient</button>
            <button className={mode === 'existing' ? 'active' : ''} onClick={() => setMode('existing')}>Existing Patient</button>
          </div>

          {mode === 'existing' ? (
            <div className="cp-form-group">
              <label>Select Patient</label>
              <select value={form.existing_patient_id} onChange={e => set('existing_patient_id', e.target.value)}>
                <option value="">Choose patient…</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}
              </select>
            </div>
          ) : (
            <>
              <div className="cp-form-row">
                <div className="cp-form-group">
                  <label>Full Name *</label>
                  <input value={form.patient_name} onChange={e => set('patient_name', e.target.value)} placeholder="Patient name" />
                </div>
                <div className="cp-form-group">
                  <label>Phone</label>
                  <input value={form.patient_phone} onChange={e => set('patient_phone', e.target.value)} placeholder="+91 99999 00000" />
                </div>
              </div>
              <div className="cp-form-group">
                <label>Email</label>
                <input type="email" value={form.patient_email} onChange={e => set('patient_email', e.target.value)} placeholder="patient@email.com" />
              </div>
            </>
          )}

          <div className="cp-form-row">
            <div className="cp-form-group">
              <label>Date *</label>
              <input type="date" value={form.appointment_date} onChange={e => set('appointment_date', e.target.value)} />
            </div>
            <div className="cp-form-group">
              <label>Time *</label>
              <select value={form.appointment_time} onChange={e => set('appointment_time', e.target.value)}>
                {ALL_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="cp-form-group">
            <label>Reason / Chief Complaint</label>
            <input value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="e.g. Regular checkup, tooth pain…" />
          </div>

          {error && <div className="cp-modal-error">{error}</div>}
        </div>
        <div className="cp-modal-footer">
          <button className="cp-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="cp-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Scheduling…' : 'Schedule Visit'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Reschedule Modal ─────────────────────────────────────────────────── */
function RescheduleModal({ onClose, onSaved, authFetch, conflictData }) {
  const { event, attemptedDate } = conflictData;
  const [date, setDate] = useState(attemptedDate || getTodayStr());
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    onSaved(`${event.patient_name} rescheduled to ${date} at ${time}`);
  };

  return (
    <div className="cp-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="cp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="cp-modal-header">
          <h2>Slot Unavailable</h2>
          <button className="cp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cp-modal-body">
          <p style={{ fontSize: 14, color: '#475569', marginBottom: 20, lineHeight: 1.5 }}>
            That slot is already booked. Please choose another available slot for <strong>{event.patient_name}</strong>.
          </p>
          <div className="cp-form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="cp-form-group">
            <label>Available Time Slots</label>
            <select value={time} onChange={e => setTime(e.target.value)}>
              <option value="">Select a time...</option>
              {ALL_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {error && <div className="cp-modal-error">{error}</div>}
        </div>
        <div className="cp-modal-footer">
          <button className="cp-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="cp-btn-primary" onClick={handleSave} disabled={saving || !time}>
            {saving ? 'Rescheduling...' : 'Confirm Slot'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main CalendarPage ──────────────────────────────────────────────────── */
export default function CalendarPage() {
  const { authFetch, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [allEvents, setAllEvents]   = useState([]);
  const [events, setEvents]         = useState([]);
  const [todayAppts, setTodayAppts] = useState([]);
  const [view, setView]             = useState('month');
  const [date, setDate]             = useState(new Date());
  const [selected, setSelected]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [toast, setToast]           = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [slotConflictEvent, setSlotConflictEvent] = useState(null);
  const [prefillDate, setPrefillDate]   = useState('');

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Fetch ── */
  const fetchEvents = useCallback(async (d, v) => {
    setLoading(true);
    try {
      const { from, to } = getRange(d || date, v || view);
      const r = await authFetch(`/api/appointments?from=${from}&to=${to}&limit=500`);
      const data = await r.json();
      const raw = data.appointments || [];
      setAllEvents(raw);
      setEvents(applyFilter(raw, filterStatus));
    } catch {}
    setLoading(false);
  }, [date, view, filterStatus, authFetch]);

  const fetchToday = useCallback(async () => {
    const r = await authFetch(`/api/appointments?filter=today&limit=50`);
    const d = await r.json();
    setTodayAppts(d.appointments || []);
  }, [authFetch]);

  useEffect(() => { fetchEvents(date, view); fetchToday(); }, []);

  const applyFilter = (raw, status) =>
    (status === 'all' ? raw : raw.filter(a => a.status === status)).map(toEvent);

  /* ── Handlers ── */
  const handleNavigate = (d) => { setDate(d); fetchEvents(d, view); };
  const handleView     = (v) => { setView(v); fetchEvents(date, v); };

  const handleFilterStatus = (s) => {
    setFilterStatus(s);
    setEvents(applyFilter(allEvents, s));
  };

  const onEventDrop = useCallback(async ({ event, start }) => {
    if (user?.role === 'staff') { showToast('Only admins can reschedule', 'error'); return; }

    const oldDateTime = moment(`${event.appointment_date}T${event.appointment_time}`);
    if (oldDateTime.isBefore(moment())) {
      showToast('Cannot reschedule past appointments', 'error');
      return;
    }

    const newDateTime = moment(start);
    if (newDateTime.isBefore(moment())) {
      showToast('Cannot reschedule to a past date/time', 'error');
      return;
    }

    const newDate = newDateTime.format('YYYY-MM-DD');
    const newTime = newDateTime.format('HH:mm');

    setRescheduling(true);
    const r = await authFetch(`/api/appointments/${event.id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ appointment_date: newDate, appointment_time: newTime }),
    });
    const data = await r.json();
    setRescheduling(false);

    if (!r.ok) { 
        if (data.error === 'Slot already booked') {
           setSlotConflictEvent({ event, attemptedDate: newDate });
        } else {
           showToast(data.error || 'Reschedule failed', 'error'); 
        }
    }
    else { showToast(`${event.patient_name} rescheduled to ${newDate} at ${newTime}`); fetchEvents(date, view); fetchToday(); }
  }, [authFetch, fetchEvents, date, view, user]);

  const updateStatus = async (id, status) => {
    await authFetch(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    setSelected(p => ({ ...p, status }));
    fetchEvents(date, view); fetchToday();
  };

  // Click on empty slot → prefill date and open add modal
  const onSelectSlot = ({ start }) => {
    setPrefillDate(moment(start).format('YYYY-MM-DD'));
    setShowAddModal(true);
  };

  /* ── Event style getter ── */
  const eventStyleGetter = (event) => {
    const s = STATUS[event.status] || STATUS.scheduled;
    return {
      style: {
        backgroundColor: s.bg,
        borderLeft: `4px solid ${s.color}`,
        color: s.color,
        borderRadius: '6px',
        padding: '0',
        border: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      },
    };
  };

  /* ── Render ── */
  return (
    <div className="cp-root">
      {/* Toast */}
      {toast && (
        <div className={`cp-toast cp-toast--${toast.type}`}>{toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}</div>
      )}

      {/* Left sidebar — Today's Visits */}
      <aside className="cp-sidebar">
        <div className="cp-sidebar-header">
          <div>
            <div className="cp-sidebar-title">Today's visits</div>
            <div className="cp-sidebar-date">{moment().format('MMMM D, dddd')}</div>
          </div>
          <div className="cp-today-count">{todayAppts.length}</div>
        </div>

        <div className="cp-today-list">
          {todayAppts.length === 0 && (
            <div className="cp-today-empty">
              <span>🗓</span>
              <p>No appointments today</p>
            </div>
          )}
          {todayAppts.map(a => (
            <div
              key={a.id}
              className={`cp-today-item ${selected?.id === a.id ? 'active' : ''}`}
              onClick={() => setSelected(a)}
            >
              <div className="cp-today-avatar">{a.patient_name?.[0]?.toUpperCase()}</div>
              <div className="cp-today-info">
                <div className="cp-today-name">{a.patient_name}</div>
                <div className="cp-today-time">{a.appointment_time}{a.reason ? ` · ${a.reason}` : ''}</div>
              </div>
              <div className={`cp-today-status cp-today-status--${a.status}`} />
            </div>
          ))}
        </div>

        {/* Status filters */}
        <div className="cp-filter-section">
          <div className="cp-filter-label">Filter by status</div>
          <div className="cp-filter-pills">
            {['all', ...Object.keys(STATUS)].map(s => (
              <button
                key={s}
                className={`cp-filter-pill ${filterStatus === s ? 'active' : ''}`}
                style={filterStatus === s && s !== 'all'
                  ? { background: STATUS[s]?.bg, color: STATUS[s]?.color, borderColor: STATUS[s]?.border }
                  : {}}
                onClick={() => handleFilterStatus(s)}
              >
                {s === 'all' ? 'All' : STATUS[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="cp-filter-section">
          <div className="cp-filter-label">Status legend</div>
          {Object.entries(STATUS).map(([k, v]) => (
            <div key={k} className="cp-legend-row">
              <span className="cp-legend-dot" style={{ background: v.color }} />
              <span className="cp-legend-label">{v.label}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Main calendar area */}
      <div className="cp-main">
        {loading && <div className="cp-loading-bar" />}
        {rescheduling && <div className="cp-reschedule-pill">⟳ Rescheduling…</div>}

        <DnDCalendar
          localizer={localizer}
          events={events}
          view={view}
          date={date}
          onView={handleView}
          onNavigate={handleNavigate}
          onSelectEvent={(event) => setSelected(event.resource)}
          onSelectSlot={onSelectSlot}
          onEventDrop={onEventDrop}
          eventPropGetter={eventStyleGetter}
          selectable
          components={{
            toolbar: (props) => (
              <CustomToolbar {...props} onAddClick={() => { setPrefillDate(''); setShowAddModal(true); }} />
            ),
            event: view === 'month' ? MonthEvent : WeekEvent,
          }}
          style={{ height: 'calc(100vh - 72px)' }}
          draggableAccessor={() => user?.role !== 'staff'}
          resizable={false}
          popup
          step={30}
          timeslots={2}
          min={new Date(0, 0, 0, 8, 0)}
          max={new Date(0, 0, 0, 20, 0)}
        />
      </div>

      {/* Appointment detail panel */}
      {selected && (
        <div className="cp-detail-panel">
          <div className="cp-detail-header" style={{ background: STATUS[selected.status]?.color || 'var(--primary)' }}>
            <div className="cp-detail-avatar">{selected.patient_name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="cp-detail-name">{selected.patient_name}</div>
              <div className="cp-detail-status">{STATUS[selected.status]?.label || selected.status}</div>
            </div>
            <button className="cp-detail-close" onClick={() => setSelected(null)}>✕</button>
          </div>

          <div className="cp-detail-body">
            <div className="cp-detail-row">
              <span className="cp-detail-icon">📅</span>
              <div>
                <div className="cp-detail-row-label">Date</div>
                <div className="cp-detail-row-value">{selected.appointment_date}</div>
              </div>
            </div>
            <div className="cp-detail-row">
              <span className="cp-detail-icon">⏰</span>
              <div>
                <div className="cp-detail-row-label">Time</div>
                <div className="cp-detail-row-value">{selected.appointment_time}</div>
              </div>
            </div>
            {selected.patient_phone && (
              <div className="cp-detail-row">
                <span className="cp-detail-icon">📞</span>
                <div>
                  <div className="cp-detail-row-label">Phone</div>
                  <div className="cp-detail-row-value">{selected.patient_phone}</div>
                </div>
              </div>
            )}
            {selected.reason && (
              <div className="cp-detail-row">
                <span className="cp-detail-icon">📋</span>
                <div>
                  <div className="cp-detail-row-label">Reason</div>
                  <div className="cp-detail-row-value">{selected.reason}</div>
                </div>
              </div>
            )}
          </div>

          <div className="cp-detail-actions">
            {selected.status === 'scheduled' || selected.status === 'pending' ? <>
              <button className="cp-action-done" onClick={() => updateStatus(selected.id, 'completed')}>
                ✓ Mark Completed
              </button>
              <button className="cp-action-cancel" onClick={() => updateStatus(selected.id, 'cancelled')}>
                ✕ Cancel Appointment
              </button>
            </> : selected.status === 'cancelled' ? (
              <button className="cp-action-restore" onClick={() => updateStatus(selected.id, 'scheduled')}>
                ↺ Restore
              </button>
            ) : null}

            {selected.patient_id && (
              <button className="cp-action-patient" onClick={() => navigate(`/admin/patients/${selected.patient_id}`)}>
                👤 Open Patient Profile
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add appointment modal */}
      {showAddModal && (
        <AddAppointmentModal
          authFetch={authFetch}
          prefillDate={prefillDate}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchEvents(date, view); fetchToday(); showToast('Appointment scheduled!'); }}
        />
      )}

      {/* Reschedule on Conflict modal */}
      {slotConflictEvent && (
        <RescheduleModal
          authFetch={authFetch}
          conflictData={slotConflictEvent}
          onClose={() => setSlotConflictEvent(null)}
          onSaved={(msg) => {
            setSlotConflictEvent(null);
            fetchEvents(date, view);
            fetchToday();
            showToast(msg);
          }}
        />
      )}
    </div>
  );
}
