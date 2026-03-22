import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import PlanGate from '../billing/PlanGate';

const MSG_TYPE_LABEL = {
  appointment_reminder: 'Appointment Reminder',
  followup_reminder:    'Follow-up Reminder',
  review_request:       'Review Request',
  location_share:       'Location Share',
  welcome:              'Welcome',
  payment_reminder:     'Payment Reminder',
  inbound_reply:        'Patient Reply',
  manual:               'Manual',
};
const MSG_TYPE_COLOR = {
  appointment_reminder: 'info',
  followup_reminder:    'warning',
  review_request:       'success',
  location_share:       'info',
  welcome:              'info',
  payment_reminder:     'warning',
  inbound_reply:        'gray',
  manual:               'gray',
};

const WA_GREEN = '#25D366';

export default function BotDashboard() {
  const { authFetch, user } = useContext(AuthContext);
  const [status, setStatus]   = useState(null);
  const [messages, setMessages] = useState([]);
  const [inbox, setInbox]     = useState([]);
  const [tab, setTab]         = useState('overview');
  const [config, setConfig]   = useState({
    botNumber: '', autoAppointmentReminder: true, reminderHoursBefore: 24,
    autoFollowupReminder: true, autoReviewRequest: true, reviewDelayHours: 2,
    autoLocationShare: true, autoWelcome: false, autoPaymentReminder: false,
    locationUrl: '', locationLabel: '', reviewUrl: '',
  });
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');
  const [sendForm, setSendForm] = useState({ phone:'', body:'', type:'manual' });
  const [sending, setSending] = useState(false);

  const loadStatus = async () => {
    const r = await authFetch('/api/bot/status');
    const d = await r.json();
    setStatus(d);
    if (d.config) {
      setConfig(prev => ({ ...prev, ...d.config }));
    }
  };

  const loadMessages = async () => {
    const r = await authFetch('/api/bot/messages?limit=50');
    const d = await r.json();
    setMessages(d.messages || []);
  };

  const loadInbox = async () => {
    const r = await authFetch('/api/bot/inbox?limit=30');
    const d = await r.json();
    setInbox(d.messages || []);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (tab === 'messages') loadMessages();
    if (tab === 'inbox') loadInbox();
  }, [tab]);

  const handleSaveConfig = async () => {
    setSaving(true); setMsg('');
    const r = await authFetch('/api/bot/config', { method:'PUT', body: JSON.stringify(config) });
    const d = await r.json();
    setMsg(r.ok ? '✓ Bot configuration saved' : d.error || 'Save failed');
    setSaving(false);
    loadStatus();
  };

  const handleManualSend = async () => {
    if (!sendForm.phone || !sendForm.body) return;
    setSending(true);
    const r = await authFetch('/api/bot/send', { method:'POST', body: JSON.stringify({ phone: sendForm.phone, body: sendForm.body, message_type: sendForm.type }) });
    const d = await r.json();
    if (r.ok && d.waLink) {
      window.open(d.waLink, '_blank');
    }
    setMsg(r.ok ? '✓ Message sent' : d.error || 'Failed');
    setSending(false);
    setSendForm(f => ({ ...f, phone:'', body:'' }));
    if (tab === 'messages') loadMessages();
  };

  const tabStyle = (active) => ({
    padding:'7px 16px', border:'none', background:'transparent', cursor:'pointer',
    fontFamily:'var(--font)', fontSize:13, fontWeight:active?600:400,
    color: active ? WA_GREEN : 'var(--text-secondary)',
    borderBottom: active ? `2px solid ${WA_GREEN}` : '2px solid transparent',
    marginBottom:-2,
  });

  const setField = (k, v) => setConfig(c => ({ ...c, [k]: v }));

  const BotContent = () => (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1>
            <span style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill={WA_GREEN}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp Bot
            </span>
          </h1>
          <p>Automated messages for your clinic</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', background: config.isConnected ? '#f0fdf4' : '#fef3c7', border:`1px solid ${config.isConnected ? '#86efac' : '#fcd34d'}`, borderRadius:20, fontSize:13 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background: config.isConnected ? '#16a34a' : '#d97706' }} />
            <span style={{ color: config.isConnected ? '#166534' : '#92400e' }}>{config.isConnected ? 'Bot connected' : 'Not connected'}</span>
          </div>
        </div>
      </div>

      {msg && <div className={msg.startsWith('✓') ? 'success-banner' : 'error-banner'} style={{ marginBottom:16 }}>{msg}<button className="btn-icon" style={{ marginLeft:8 }} onClick={() => setMsg('')}>✕</button></div>}

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:20 }}>
        {[
          { label:'Total sent', value: status?.totalSent || 0, color:'blue' },
          { label:'Appointment reminders', value: status?.stats?.appointment_reminder || 0, color:'info' },
          { label:'Follow-up reminders', value: status?.stats?.followup_reminder || 0, color:'warning' },
          { label:'Patient replies', value: status?.stats?.inbound_reply || 0, color:'success' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom:'2px solid var(--border)', marginBottom:20 }}>
        {[['overview','⚙️ Setup'],['messages','📤 Sent'],['inbox','📥 Inbox'],['send','✉️ Send Now']].map(([id,lbl]) => (
          <button key={id} style={tabStyle(tab===id)} onClick={() => setTab(id)}>{lbl}</button>
        ))}
      </div>

      {/* ── Setup tab ── */}
      {tab === 'overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div className="card">
            <div className="card-header"><h2>Bot Phone Number</h2></div>
            <div className="card-body">
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'12px 14px', marginBottom:14, fontSize:13, color:'#166534', lineHeight:1.7 }}>
                <strong>How to set up:</strong><br/>
                1. Get a separate SIM or use an existing number<br/>
                2. Install WhatsApp on a phone with that number<br/>
                3. Enter the number below — bot messages show as coming from this number<br/>
                4. For fully automated sending, set up WhatsApp Cloud API (Meta) credentials in your .env file
              </div>
              <div className="form-group">
                <label>Bot WhatsApp Number</label>
                <div style={{ display:'flex', gap:8 }}>
                  <span style={{ padding:'10px 12px', background:'var(--bg-main)', border:'1px solid var(--border)', borderRadius:6, fontSize:14, color:'var(--text-muted)' }}>+91</span>
                  <input value={config.botNumber || ''} onChange={e => setField('botNumber', e.target.value)} placeholder="9876500000" style={{ flex:1 }} />
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Different from the clinic's main number</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2>Automation Toggles</h2></div>
            <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { key:'autoAppointmentReminder', label:'Appointment reminders', sub:'Sent 24h before appointment' },
                { key:'autoFollowupReminder',    label:'Follow-up reminders',   sub:'Sent on follow-up due date' },
                { key:'autoReviewRequest',       label:'Review requests',        sub:'2h after appointment completed' },
                { key:'autoLocationShare',       label:'Location auto-reply',    sub:'Patient texts LOCATION → bot replies' },
                { key:'autoWelcome',             label:'Welcome message',        sub:'When new patient is added' },
                { key:'autoPaymentReminder',     label:'Payment reminders',      sub:'Unpaid invoices > 7 days' },
              ].map(item => (
                <div key={item.key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500 }}>{item.label}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>{item.sub}</div>
                  </div>
                  <label style={{ position:'relative', width:40, height:22, cursor:'pointer', flexShrink:0 }}>
                    <input type="checkbox" checked={!!config[item.key]} onChange={e => setField(item.key, e.target.checked)} style={{ opacity:0, width:0, height:0 }} />
                    <span style={{ position:'absolute', inset:0, borderRadius:11, background: config[item.key] ? WA_GREEN : 'var(--border)', transition:'background .2s' }} />
                    <span style={{ position:'absolute', top:3, left: config[item.key] ? 21 : 3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }} />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2>Location & Review Links</h2></div>
            <div className="card-body">
              <div className="form-group">
                <label>Google Maps URL</label>
                <input value={config.locationUrl || ''} onChange={e => setField('locationUrl', e.target.value)} placeholder="https://maps.app.goo.gl/..." />
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Bot sends this when patient texts "LOCATION"</div>
              </div>
              <div className="form-group">
                <label>Location Label</label>
                <input value={config.locationLabel || ''} onChange={e => setField('locationLabel', e.target.value)} placeholder="Our clinic is located at..." />
              </div>
              <div className="form-group">
                <label>Review Link (Google / Practo)</label>
                <input value={config.reviewUrl || ''} onChange={e => setField('reviewUrl', e.target.value)} placeholder="https://g.page/r/..." />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2>Timing Settings</h2></div>
            <div className="card-body">
              <div className="form-group">
                <label>Send appointment reminder — hours before</label>
                <select value={config.reminderHoursBefore || 24} onChange={e => setField('reminderHoursBefore', parseInt(e.target.value))}>
                  {[1,2,4,6,12,24,48].map(h => <option key={h} value={h}>{h}h before</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Send review request — hours after appointment</label>
                <select value={config.reviewDelayHours || 2} onChange={e => setField('reviewDelayHours', parseInt(e.target.value))}>
                  {[1,2,3,4,6,12,24].map(h => <option key={h} value={h}>{h}h after</option>)}
                </select>
              </div>
              <div style={{ background:'var(--bg-main)', borderRadius:8, padding:'12px', fontSize:12, color:'var(--text-muted)' }}>
                The bot scheduler runs every 30 minutes and automatically sends due messages.
              </div>
            </div>
          </div>

          <div style={{ gridColumn:'1/-1', display:'flex', gap:8 }}>
            <button className="btn btn-primary" onClick={handleSaveConfig} disabled={saving}>{saving ? 'Saving…' : '💾 Save Bot Settings'}</button>
          </div>
        </div>
      )}

      {/* ── Sent messages tab ── */}
      {tab === 'messages' && (
        <div className="card">
          <div className="card-header">
            <h2>Sent Messages</h2>
            <button className="btn btn-secondary btn-sm" onClick={loadMessages}>↻ Refresh</button>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Patient</th><th>Phone</th><th>Type</th><th>Preview</th><th>Status</th><th>Time</th></tr></thead>
              <tbody>
                {!messages.length && <tr><td colSpan={6}><div className="empty-state"><div className="icon">📤</div><p>No messages sent yet</p></div></td></tr>}
                {messages.map(m => (
                  <tr key={m.id}>
                    <td><strong>{m.patientName || '—'}</strong></td>
                    <td style={{ fontFamily:'monospace', fontSize:12 }}>{m.phone}</td>
                    <td><span className={`badge badge-${MSG_TYPE_COLOR[m.messageType] || 'gray'}`} style={{ fontSize:11 }}>{MSG_TYPE_LABEL[m.messageType] || m.messageType}</span></td>
                    <td style={{ fontSize:12, color:'var(--text-muted)', maxWidth:220 }}>
                      <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.body?.slice(0,60)}{m.body?.length > 60 ? '…' : ''}</div>
                    </td>
                    <td><span className={`badge badge-${m.status === 'sent' || m.status === 'delivered' ? 'success' : m.status === 'failed' ? 'danger' : 'gray'}`} style={{ fontSize:11 }}>{m.status}</span></td>
                    <td style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                      {new Date(m.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Inbox tab ── */}
      {tab === 'inbox' && (
        <div className="card">
          <div className="card-header">
            <h2>Patient Replies</h2>
            <button className="btn btn-secondary btn-sm" onClick={loadInbox}>↻ Refresh</button>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Phone</th><th>Message</th><th>Time</th></tr></thead>
              <tbody>
                {!inbox.length && <tr><td colSpan={3}><div className="empty-state"><div className="icon">📥</div><p>No patient replies yet. Patient replies from the bot number appear here.</p></div></td></tr>}
                {inbox.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontFamily:'monospace' }}>{m.phone}</td>
                    <td style={{ fontSize:13 }}>{m.body}</td>
                    <td style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                      {new Date(m.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Manual send tab ── */}
      {tab === 'send' && (
        <div style={{ maxWidth:600 }}>
          <div className="card">
            <div className="card-header"><h2>Send a Message Now</h2></div>
            <div className="card-body">
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#166534' }}>
                If WhatsApp Cloud API is not set up, clicking Send will open WhatsApp with the message pre-filled. You send it from your device.
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" value={sendForm.phone} onChange={e => setSendForm(f => ({ ...f, phone:e.target.value }))} placeholder="+91 9876543210" />
              </div>
              <div className="form-group">
                <label>Message Type</label>
                <select value={sendForm.type} onChange={e => setSendForm(f => ({ ...f, type:e.target.value }))}>
                  {Object.entries(MSG_TYPE_LABEL).filter(([k]) => k !== 'inbound_reply').map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea rows={5} value={sendForm.body} onChange={e => setSendForm(f => ({ ...f, body:e.target.value }))} placeholder="Type your message…" />
              </div>
              <button
                className="btn"
                style={{ background:WA_GREEN, color:'#fff', border:'none', display:'flex', alignItems:'center', gap:8 }}
                onClick={handleManualSend}
                disabled={sending || !sendForm.phone || !sendForm.body}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {sending ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <PlanGate
      feature="botEnabled"
      title="WhatsApp Bot — Pro & Enterprise"
      description="Automate appointment reminders, follow-ups, review requests and location sharing. Your patients get automatic WhatsApp messages from a dedicated bot number."
    >
      <BotContent />
    </PlanGate>
  );
}
