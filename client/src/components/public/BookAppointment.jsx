import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './Public.css';
const ALL_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];
export default function BookAppointment() {
  const [searchParams] = useSearchParams(); const navigate = useNavigate();
  const clinicSlug = searchParams.get('clinic')||'default';
  const [clinic, setClinic] = useState(null);
  const [form, setForm] = useState({ patient_name:'', patient_phone:'', patient_email:'', appointment_date:'', appointment_time:'', reason:'' });
  const [slots, setSlots] = useState([]); const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false); const [error, setError] = useState('');
  useEffect(() => { fetch(`/api/appointments/clinic-info?clinic=${clinicSlug}`).then(r=>r.json()).then(d=>{ if (!d.error) setClinic(d); }); }, []);
  useEffect(() => {
    if (!form.appointment_date) return;
    fetch(`/api/appointments/available-slots?clinic=${clinicSlug}&date=${form.appointment_date}`).then(r=>r.json()).then(d=>setSlots(d.slots||[]));
  }, [form.appointment_date]);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleSubmit = async () => {
    if (!form.patient_name||!form.appointment_date||!form.appointment_time) return setError('Please fill in all required fields');
    
    // Frontend validation for past dates/times
    const apptDateTime = new Date(`${form.appointment_date}T${form.appointment_time}`);
    if (apptDateTime < new Date()) {
      return setError('Appointment cannot be scheduled for past date/time');
    }

    setLoading(true); setError('');
    const res = await fetch(`/api/appointments/book?clinic=${clinicSlug}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error||'Booking failed'); setLoading(false); return; }
    setSuccess(true); setLoading(false);
  };
  if (success) return (
    <div className="public-page">
      <nav className="public-nav"><div className="nav-brand">🏥 {clinic?.name||'Medical CRM'}</div><button className="btn btn-secondary btn-sm" onClick={()=>navigate(`/?clinic=${clinicSlug}`)}>← Home</button></nav>
      <div className="booking-success">
        <div className="success-icon">✅</div><h1>Appointment Booked!</h1>
        <p>Your appointment is confirmed for <strong>{form.appointment_date}</strong> at <strong>{form.appointment_time}</strong>.</p>
        <p style={{ marginTop:8 }}>We'll see you soon, {form.patient_name}!</p>
        <button className="btn btn-primary" style={{ marginTop:24 }} onClick={()=>navigate(`/?clinic=${clinicSlug}`)}>← Back to Home</button>
      </div>
    </div>
  );
  return (
    <div className="public-page">
      <nav className="public-nav"><div className="nav-brand">🏥 {clinic?.name||'Medical CRM'}</div><button className="btn btn-secondary btn-sm" onClick={()=>navigate(`/?clinic=${clinicSlug}`)}>← Home</button></nav>
      <div className="booking-page">
        <div className="booking-header"><h1>Book an Appointment</h1>{clinic && <p>at <strong>{clinic.name}</strong></p>}</div>
        <div className="booking-form card">
          <div className="card-body">
            {error && <div className="error-banner">{error}</div>}
            <h2 style={{ marginBottom:16, fontSize:15, color:'var(--text-secondary)' }}>Your Details</h2>
            <div className="form-row">
              <div className="form-group"><label>Full Name *</label><input value={form.patient_name} onChange={e=>set('patient_name',e.target.value)} placeholder="Your full name" autoFocus /></div>
              <div className="form-group"><label>Phone *</label><input value={form.patient_phone} onChange={e=>set('patient_phone',e.target.value)} placeholder="+91 9876543210" /></div>
            </div>
            <div className="form-group"><label>Email</label><input type="email" value={form.patient_email} onChange={e=>set('patient_email',e.target.value)} placeholder="your@email.com" /></div>
            <div className="form-group"><label>Reason for Visit</label><input value={form.reason} onChange={e=>set('reason',e.target.value)} placeholder="Brief description" /></div>
            <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'20px 0' }} />
            <h2 style={{ marginBottom:16, fontSize:15, color:'var(--text-secondary)' }}>Choose Date & Time</h2>
            <div className="form-group"><label>Date *</label><input type="date" min={new Date().toISOString().split('T')[0]} value={form.appointment_date} onChange={e=>{ set('appointment_date',e.target.value); set('appointment_time',''); }} /></div>
            {form.appointment_date && (
              <div className="form-group"><label>Available Slots *</label>
                {slots.length===0 ? <p style={{ color:'var(--danger)', fontSize:14 }}>No slots available. Please choose another date.</p> : (
                  <div className="slots-grid">
                    {ALL_SLOTS.map(slot => {
                      const available = slots.includes(slot); const selected = form.appointment_time===slot;
                      return <button key={slot} disabled={!available} className={`slot-btn ${selected?'selected':''} ${!available?'unavailable':''}`} onClick={()=>available&&set('appointment_time',slot)}>{slot}</button>;
                    })}
                  </div>
                )}
              </div>
            )}
            <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:15, marginTop:8 }} onClick={handleSubmit} disabled={loading||!form.appointment_time}>
              {loading?'Booking…':'📅 Confirm Appointment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
