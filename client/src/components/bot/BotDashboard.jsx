import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import PlanGate from '../billing/PlanGate';

const WA_GREEN  = '#25D366';
const META_BLUE = '#0866FF';
const BRAND     = 'CodeCrafters Health';

const MSG_LABEL = {
  appointment_reminder: 'Appt Reminder',
  followup_reminder:    'Follow-up',
  review_request:       'Review Request',
  location_share:       'Location',
  welcome:              'Welcome',
  payment_reminder:     'Payment',
  inbound_reply:        'Patient Reply',
  manual:               'Manual',
};
const MSG_COLOR = {
  appointment_reminder: '#3b82f6',
  followup_reminder:    '#f59e0b',
  review_request:       '#10b981',
  location_share:       '#6366f1',
  welcome:              '#06b6d4',
  payment_reminder:     '#ef4444',
  inbound_reply:        '#8b5cf6',
  manual:               '#6b7280',
};
const STATUS_COLOR = {
  delivered: '#10b981',
  sent:      '#3b82f6',
  failed:    '#ef4444',
  received:  '#8b5cf6',
  read:      '#10b981',
};

const Badge = ({ label, color }) => (
  <span style={{
    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
    background: color + '18', color, border: `1px solid ${color}44`, whiteSpace: 'nowrap',
  }}>{label}</span>
);

const Toggle = ({ checked, onChange }) => (
  <label style={{ position: 'relative', width: 40, height: 22, cursor: 'pointer', flexShrink: 0 }}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
    <span style={{ position: 'absolute', inset: 0, borderRadius: 11, background: checked ? WA_GREEN : '#d1d5db', transition: 'background .2s' }} />
    <span style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
  </label>
);

const buildConversations = (messages) => {
  const map = {};
  for (const m of messages) {
    const key = m.phone;
    if (!map[key]) {
      map[key] = { phone: m.phone, patientName: m.patientName || null, messages: [], lastAt: m.createdAt, unread: 0, hasPending: false };
    }
    map[key].messages.push(m);
    if (new Date(m.createdAt) > new Date(map[key].lastAt)) map[key].lastAt = m.createdAt;
    if (m.direction === 'inbound') map[key].unread += 1;
    if (m.status === 'failed') map[key].hasPending = true;
  }
  return Object.values(map).sort((a, b) => b.unread - a.unread || new Date(b.lastAt) - new Date(a.lastAt));
};

const fmtTime = (ts) => new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

// ── Main component — BotContent is NOT a nested component to avoid remount-on-keypress ──
export default function BotDashboard() {
  const { authFetch } = useContext(AuthContext);

  const [status, setStatus]         = useState(null);
  const [allMessages, setAllMessages] = useState([]);
  const [inbox, setInbox]           = useState([]);
  const [tab, setTab]               = useState('overview');
  const [selectedConv, setSelectedConv] = useState(null);
  const [config, setConfig]         = useState({
    botNumber: '', autoAppointmentReminder: true, reminderHoursBefore: 24,
    autoFollowupReminder: true, autoReviewRequest: true, reviewDelayHours: 2,
    autoLocationShare: true, autoWelcome: false, autoPaymentReminder: false,
    locationUrl: '', locationLabel: '', reviewUrl: '',
  });
  const [saving, setSaving]         = useState(false);
  const [statusMsg, setStatusMsg]   = useState('');
  const [sendForm, setSendForm]     = useState({ phone: '', body: '', type: 'manual' });
  const [sending, setSending]       = useState(false);

  const loadStatus = useCallback(async () => {
    const r = await authFetch('/api/bot/status');
    const d = await r.json();
    setStatus(d);
    if (d.config) setConfig(prev => ({ ...prev, ...d.config }));
  }, [authFetch]);

  const loadMessages = useCallback(async () => {
    const r = await authFetch('/api/bot/messages?limit=200');
    const d = await r.json();
    setAllMessages(d.messages || []);
  }, [authFetch]);

  const loadInbox = useCallback(async () => {
    const r = await authFetch('/api/bot/inbox?limit=50');
    const d = await r.json();
    setInbox(d.messages || []);
  }, [authFetch]);

  useEffect(() => { loadStatus(); }, []);
  useEffect(() => {
    if (tab === 'conversations' || tab === 'messages') loadMessages();
    if (tab === 'inbox') loadInbox();
  }, [tab]);

  const handleSaveConfig = async () => {
    setSaving(true); setStatusMsg('');
    const r = await authFetch('/api/bot/config', { method: 'PUT', body: JSON.stringify(config) });
    const d = await r.json();
    setStatusMsg(r.ok ? '✓ Settings saved' : d.error || 'Save failed');
    setSaving(false);
    loadStatus();
  };

  const handleManualSend = async () => {
    if (!sendForm.phone || !sendForm.body) return;
    setSending(true);
    const r = await authFetch('/api/bot/send', {
      method: 'POST',
      body: JSON.stringify({ phone: sendForm.phone, body: sendForm.body, message_type: sendForm.type }),
    });
    const d = await r.json();
    if (r.ok && d.waLink) window.open(d.waLink, '_blank');
    setStatusMsg(r.ok ? '✓ Message sent' : d.error || 'Failed');
    setSending(false);
    setSendForm(f => ({ ...f, phone: '', body: '' }));
    loadMessages();
  };

  const setField   = (k, v) => setConfig(c => ({ ...c, [k]: v }));
  const setSendField = (k, v) => setSendForm(f => ({ ...f, [k]: v }));

  const isConfigured  = status?.cloudApiConfigured;
  const conversations = buildConversations(allMessages);
  const convForPhone  = selectedConv ? allMessages.filter(m => m.phone === selectedConv).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) : [];
  const totalUnread   = conversations.reduce((s, c) => s + c.unread, 0);
  const totalFailed   = allMessages.filter(m => m.status === 'failed').length;

  const tabStyle = (active) => ({
    padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
    fontFamily: 'var(--font)', fontSize: 13, fontWeight: active ? 600 : 400,
    color: active ? WA_GREEN : 'var(--text-secondary)',
    borderBottom: active ? `2px solid ${WA_GREEN}` : '2px solid transparent',
    marginBottom: -2,
  });

  return (
    <PlanGate
      feature="botEnabled"
      title="WhatsApp Automation — Pro & Enterprise"
      description={`Automate patient communication via ${BRAND}'s central Meta WhatsApp Cloud API number.`}
    >
      <div className="page">
        {/* Header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={WA_GREEN}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp Automation
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Powered by <strong>{BRAND}</strong> · Meta Cloud API
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {totalUnread > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', background:'#f5f3ff', border:'1px solid #c4b5fd', borderRadius:20, fontSize:13, color:'#7c3aed' }}>
                💬 {totalUnread} unread
              </div>
            )}
            {totalFailed > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:20, fontSize:13, color:'#dc2626' }}>
                ⚠️ {totalFailed} failed
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', background: isConfigured ? '#f0fdf4' : '#fffbeb', border:`1px solid ${isConfigured ? '#86efac' : '#fcd34d'}`, borderRadius:20, fontSize:13 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background: isConfigured ? '#16a34a' : '#d97706' }} />
              <span style={{ color: isConfigured ? '#166534' : '#92400e' }}>
                {isConfigured ? 'Cloud API Active' : 'API Not Configured'}
              </span>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div className={statusMsg.startsWith('✓') ? 'success-banner' : 'error-banner'} style={{ marginBottom: 16 }}>
            {statusMsg}
            <button className="btn-icon" style={{ marginLeft: 8 }} onClick={() => setStatusMsg('')}>✕</button>
          </div>
        )}

        {!isConfigured && (
          <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'12px 16px', marginBottom:16, fontSize:13, color:'#78350f' }}>
            <strong>⚠️ Cloud API not configured.</strong> Add <code>WHATSAPP_TOKEN</code> and <code>WHATSAPP_PHONE_ID</code> to <code>server/.env</code>. Manual wa.me links are available in the meantime.
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns:'repeat(5,1fr)', marginBottom:20 }}>
          {[
            { label:'Total Sent',       value: status?.totalSent || 0,                    color:'#3b82f6' },
            { label:'Appt Reminders',   value: status?.stats?.appointment_reminder || 0,  color:'#06b6d4' },
            { label:'Follow-ups',       value: status?.stats?.followup_reminder || 0,     color:'#f59e0b' },
            { label:'Patient Replies',  value: status?.stats?.inbound_reply || 0,         color:'#8b5cf6' },
            { label:'Failed',           value: totalFailed,                               color:'#ef4444' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ borderLeft:`3px solid ${s.color}` }}>
              <div className="stat-label" style={{ fontSize:11 }}>{s.label}</div>
              <div className="stat-value" style={{ color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ borderBottom:'2px solid var(--border)', marginBottom:20 }}>
          {[
            ['overview',      '⚙️ Setup'],
            ['conversations', `💬 Conversations${totalUnread > 0 ? ` (${totalUnread})` : ''}`],
            ['messages',      '📤 All Sent'],
            ['inbox',         '📥 Inbox'],
            ['send',          '✉️ Send Now'],
          ].map(([id, lbl]) => (
            <button key={id} style={tabStyle(tab === id)} onClick={() => setTab(id)}>{lbl}</button>
          ))}
        </div>

        {/* ── Setup Tab ── */}
        {tab === 'overview' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <div className="card" style={{ gridColumn:'1/-1' }}>
              <div className="card-header">
                <h2><span style={{ color:META_BLUE }}>Meta</span> WhatsApp Business Cloud API — Setup Guide</h2>
              </div>
              <div className="card-body">
                <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'12px 16px', fontSize:13, color:'#1e40af', lineHeight:1.9 }}>
                  <strong>One-time setup (platform admin):</strong><br/>
                  1. Go to <strong>developers.facebook.com</strong> → Create App → WhatsApp<br/>
                  2. Add a verified business phone number<br/>
                  3. Copy <strong>Access Token</strong> → <code>WHATSAPP_TOKEN</code> in <code>server/.env</code><br/>
                  4. Copy <strong>Phone Number ID</strong> → <code>WHATSAPP_PHONE_ID</code> in <code>server/.env</code><br/>
                  5. Register Webhook: <code>https://yourserver.com/api/bot/webhook</code><br/>
                  6. Verify Token: <code>medicalcrm</code> (or via <code>WEBHOOK_VERIFY_TOKEN</code>)<br/>
                  7. Restart server — all clinics are now automated 🎉
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2>Clinic Contact Number</h2></div>
              <div className="card-body">
                <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:12 }}>
                  All messages are sent from the <strong>central {BRAND} number</strong>. Save your clinic's contact for reference.
                </div>
                <div className="form-group">
                  <label>Doctor / Clinic WhatsApp</label>
                  <div style={{ display:'flex', gap:8 }}>
                    <span style={{ padding:'10px 12px', background:'var(--bg-main)', border:'1px solid var(--border)', borderRadius:6, fontSize:14, color:'var(--text-muted)', flexShrink:0 }}>+91</span>
                    <input
                      value={config.botNumber || ''}
                      onChange={e => setField('botNumber', e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2>Automation Rules</h2></div>
              <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { key:'autoAppointmentReminder', label:'Appointment Reminder', sub:'24h before appointment' },
                  { key:'autoFollowupReminder',    label:'Follow-up Reminder',   sub:'2–3 days after visit' },
                  { key:'autoReviewRequest',       label:'Review Request',        sub:'After successful visit' },
                  { key:'autoLocationShare',       label:'Location Auto-reply',   sub:'Patient texts LOCATION' },
                  { key:'autoWelcome',             label:'Welcome Message',       sub:'On new patient registration' },
                  { key:'autoPaymentReminder',     label:'Payment Reminder',      sub:'Unpaid invoices > 7 days' },
                ].map(item => (
                  <div key={item.key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500 }}>{item.label}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{item.sub}</div>
                    </div>
                    <Toggle checked={!!config[item.key]} onChange={e => setField(item.key, e.target.checked)} />
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
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>Sent when patient replies "LOCATION"</div>
                </div>
                <div className="form-group">
                  <label>Location Label</label>
                  <input value={config.locationLabel || ''} onChange={e => setField('locationLabel', e.target.value)} placeholder="Turn left at the junction..." />
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
                  <label>Appointment reminder — hours before</label>
                  <select value={config.reminderHoursBefore || 24} onChange={e => setField('reminderHoursBefore', parseInt(e.target.value))}>
                    {[1,2,4,6,12,24,48].map(h => <option key={h} value={h}>{h}h before</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Review request — hours after appointment</label>
                  <select value={config.reviewDelayHours || 2} onChange={e => setField('reviewDelayHours', parseInt(e.target.value))}>
                    {[1,2,3,4,6,12,24].map(h => <option key={h} value={h}>{h}h after</option>)}
                  </select>
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)', background:'var(--bg-main)', padding:10, borderRadius:6 }}>
                  Scheduler runs every 30 min. Daily briefing 8AM, EOD summary 7PM.
                </div>
              </div>
            </div>

            <div style={{ gridColumn:'1/-1' }}>
              <button className="btn btn-primary" onClick={handleSaveConfig} disabled={saving}>
                {saving ? 'Saving…' : '💾 Save Settings'}
              </button>
            </div>
          </div>
        )}

        {/* ── Conversations Tab ── */}
        {tab === 'conversations' && (
          <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:16, height:600 }}>
            <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', display:'flex', flexDirection:'column' }}>
              <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', fontSize:13, fontWeight:600, background:'var(--bg-main)' }}>
                💬 {conversations.length} Conversations
              </div>
              <div style={{ flex:1, overflowY:'auto' }}>
                {!conversations.length && (
                  <div style={{ padding:24, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No conversations yet</div>
                )}
                {conversations.map(conv => (
                  <div
                    key={conv.phone}
                    onClick={() => setSelectedConv(conv.phone)}
                    style={{
                      padding:'12px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)',
                      background: selectedConv === conv.phone ? '#f0fdf4' : conv.unread > 0 ? '#faf5ff' : 'transparent',
                      borderLeft:`3px solid ${conv.unread > 0 ? '#8b5cf6' : conv.hasPending ? '#ef4444' : 'transparent'}`,
                    }}
                  >
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <div style={{ fontWeight: conv.unread > 0 ? 700 : 500, fontSize:13 }}>{conv.patientName || conv.phone}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{fmtTime(conv.lastAt)}</div>
                    </div>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {conv.unread > 0 && <Badge label={`${conv.unread} unread`} color="#7c3aed" />}
                      {conv.hasPending && <Badge label="⚠ failed" color="#dc2626" />}
                      {!conv.unread && !conv.hasPending && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{conv.messages.length} messages</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', display:'flex', flexDirection:'column' }}>
              {!selectedConv ? (
                <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:14 }}>
                  ← Select a conversation
                </div>
              ) : (
                <>
                  <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg-main)', display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:WA_GREEN+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>👤</div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:14 }}>{convForPhone[0]?.patientName || selectedConv}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{selectedConv}</div>
                    </div>
                  </div>
                  <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:10 }}>
                    {convForPhone.map((m, i) => (
                      <div key={i} style={{ display:'flex', justifyContent: m.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth:'70%', padding:'10px 14px', borderRadius:12,
                          background: m.direction === 'outbound' ? '#dcfce7' : 'var(--bg-main)',
                          border:'1px solid var(--border)',
                          borderBottomRightRadius: m.direction === 'outbound' ? 2 : 12,
                          borderBottomLeftRadius:  m.direction === 'inbound'  ? 2 : 12,
                        }}>
                          <div style={{ fontSize:12, wordBreak:'break-word', whiteSpace:'pre-wrap', lineHeight:1.5 }}>{m.body}</div>
                          <div style={{ display:'flex', gap:6, marginTop:6, alignItems:'center', justifyContent:'space-between' }}>
                            <Badge label={MSG_LABEL[m.messageType] || m.messageType} color={MSG_COLOR[m.messageType] || '#6b7280'} />
                            <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                              <span style={{ fontSize:10, color:STATUS_COLOR[m.status] || '#6b7280', fontWeight:600 }}>●</span>
                              <span style={{ fontSize:10, color:'var(--text-muted)' }}>{fmtTime(m.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── All Sent Tab ── */}
        {tab === 'messages' && (
          <div className="card">
            <div className="card-header">
              <h2>Sent Messages</h2>
              <button className="btn btn-secondary btn-sm" onClick={loadMessages}>↻ Refresh</button>
            </div>
            <div className="table-container">
              <table>
                <thead><tr><th>Patient</th><th>Phone</th><th>Type</th><th>Message</th><th>Status</th><th>Time</th></tr></thead>
                <tbody>
                  {!allMessages.length && (
                    <tr><td colSpan={6}><div className="empty-state"><div className="icon">📤</div><p>No messages yet</p></div></td></tr>
                  )}
                  {allMessages.filter(m => m.direction === 'outbound').map(m => (
                    <tr key={m.id}>
                      <td><strong>{m.patientName || '—'}</strong></td>
                      <td style={{ fontFamily:'monospace', fontSize:12 }}>{m.phone}</td>
                      <td><Badge label={MSG_LABEL[m.messageType] || m.messageType} color={MSG_COLOR[m.messageType] || '#6b7280'} /></td>
                      <td style={{ fontSize:12, maxWidth:200 }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text-muted)' }}>
                          {m.body?.slice(0,55)}{m.body?.length > 55 ? '…' : ''}
                        </div>
                      </td>
                      <td><span style={{ fontSize:11, fontWeight:600, color:STATUS_COLOR[m.status] || '#6b7280' }}>● {m.status}</span></td>
                      <td style={{ fontSize:11, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmtTime(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Inbox Tab ── */}
        {tab === 'inbox' && (
          <div className="card">
            <div className="card-header">
              <h2>Patient Replies & Inbound</h2>
              <button className="btn btn-secondary btn-sm" onClick={loadInbox}>↻ Refresh</button>
            </div>
            <div className="table-container">
              <table>
                <thead><tr><th>Phone</th><th>Message</th><th>Auto-handled</th><th>Time</th></tr></thead>
                <tbody>
                  {!inbox.length && (
                    <tr><td colSpan={4}><div className="empty-state"><div className="icon">📥</div><p>No patient replies yet</p></div></td></tr>
                  )}
                  {inbox.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontFamily:'monospace', fontSize:12 }}>{m.phone}</td>
                      <td style={{ fontSize:13 }}>{m.body}</td>
                      <td><Badge label="✓ Handled" color="#10b981" /></td>
                      <td style={{ fontSize:11, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmtTime(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Send Now Tab ── */}
        {tab === 'send' && (
          <div style={{ maxWidth:600 }}>
            <div className="card">
              <div className="card-header"><h2>Send Message Now</h2></div>
              <div className="card-body">
                <div style={{ background: isConfigured ? '#f0fdf4' : '#fffbeb', border:`1px solid ${isConfigured ? '#bbf7d0' : '#fcd34d'}`, borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color: isConfigured ? '#166534' : '#78350f' }}>
                  {isConfigured
                    ? '✅ Cloud API active — messages sent instantly via Meta.'
                    : '⚠️ Cloud API not configured — clicking Send will open WhatsApp on your device.'}
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={sendForm.phone}
                    onChange={e => setSendField('phone', e.target.value)}
                    placeholder="+91 9876543210"
                  />
                </div>
                <div className="form-group">
                  <label>Message Type</label>
                  <select value={sendForm.type} onChange={e => setSendField('type', e.target.value)}>
                    {Object.entries(MSG_LABEL).filter(([k]) => k !== 'inbound_reply').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Message</label>
                  <textarea
                    rows={5}
                    value={sendForm.body}
                    onChange={e => setSendField('body', e.target.value)}
                    placeholder="Type your message…"
                  />
                </div>
                <button
                  className="btn"
                  style={{ background:WA_GREEN, color:'#fff', border:'none', display:'flex', alignItems:'center', gap:8 }}
                  onClick={handleManualSend}
                  disabled={sending || !sendForm.phone || !sendForm.body}
                >
                  {sending ? 'Sending…' : '📤 Send Message'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PlanGate>
  );
}
