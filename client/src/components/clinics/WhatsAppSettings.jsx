import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const TEMPLATES = [
  {
    id: 'appointment_reminder',
    label: 'Appointment Reminder',
    icon: '📅',
    description: 'Sent before a scheduled appointment with YES/NO confirmation',
    preview: (clinic) =>
`Hi [Patient Name],

Reminder from *${clinic}*:

You have an appointment on *[Date]* at *[Time]*.

Please reply:
✅ *YES* to confirm
❌ *NO* to cancel or reschedule

_${clinic}_`,
  },
  {
    id: 'prescription',
    label: 'Prescription Share',
    icon: '💊',
    description: 'Share prescription details with medications after a visit',
    preview: (clinic) =>
`Hi [Patient Name],

Your prescription from *${clinic}*:

*Diagnosis:* [Diagnosis]

*Medications:*
• [Medicine 1] — [Dosage], [Frequency] for [Duration]
• [Medicine 2] — [Dosage], [Frequency] for [Duration]

Please follow the prescribed dosage. Contact us for any questions.

_${clinic}_`,
  },
  {
    id: 'followup_reminder',
    label: 'Follow-up Reminder',
    icon: '🔔',
    description: 'Remind patients about due follow-up appointments',
    preview: (clinic) =>
`Hi [Patient Name],

*${clinic}* would like to remind you about your *[Type]* appointment due on *[Date]*.

Please call us to schedule.

_${clinic}_`,
  },
  {
    id: 'report_ready',
    label: 'Report Ready',
    icon: '📋',
    description: 'Notify patient that their report or test result is ready',
    preview: (clinic) =>
`Hi [Patient Name],

Your report from *${clinic}* is ready.

Please visit us or call to collect your report.

_${clinic}_`,
  },
  {
    id: 'payment_reminder',
    label: 'Payment Reminder',
    icon: '💰',
    description: 'Remind patient about a pending invoice',
    preview: (clinic) =>
`Hi [Patient Name],

This is a gentle reminder from *${clinic}* about your pending payment of *₹[Amount]* for Invoice #[Number].

Please settle at your earliest convenience.

_${clinic}_`,
  },
];

export default function WhatsAppSettings() {
  const { authFetch, user } = useContext(AuthContext);
  const clinicName = user?.clinic_name || 'Your Clinic';

  const [config, setConfig]     = useState({ waNumber: '', enableReminders: true, enablePrescriptions: true, enableFollowups: true, enableReports: true, enablePayments: false, countryCode: '91' });
  const [logs, setLogs]         = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [msg, setMsg]           = useState('');
  const [tab, setTab]           = useState('setup'); // setup | templates | logs

  // Load saved config from localStorage (server-side config optional)
  useEffect(() => {
    const saved = localStorage.getItem(`wa_config_${user?.clinic_id}`);
    if (saved) { try { setConfig(JSON.parse(saved)); } catch {} }
  }, []);

  const saveConfig = () => {
    localStorage.setItem(`wa_config_${user?.clinic_id}`, JSON.stringify(config));
    setMsg('✓ WhatsApp settings saved');
    setTimeout(() => setMsg(''), 2500);
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const r = await authFetch('/api/whatsapp/logs?limit=30');
      const d = await r.json();
      setLogs(d.logs || []);
      setLogsTotal(d.total || 0);
    } catch {}
    setLoadingLogs(false);
  };

  useEffect(() => { if (tab === 'logs') loadLogs(); }, [tab]);

  const sendTestMessage = () => {
    if (!testPhone.trim()) return;
    setTestSending(true);
    const digits  = testPhone.replace(/\D/g, '');
    const cleaned = digits.length === 10 ? `${config.countryCode}${digits}` : digits;
    const message = `Hi, this is a test message from *${clinicName}*. Your WhatsApp integration is working correctly! 🎉`;
    const url     = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setTimeout(() => setTestSending(false), 1500);
  };

  const openTemplate = (t) => setActiveTemplate(activeTemplate?.id === t.id ? null : t);

  const tabStyle = (active) => ({
    padding: '7px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
    fontFamily: 'var(--font)', fontSize: 13, fontWeight: active ? 600 : 400,
    color: active ? '#25D366' : 'var(--text-secondary)',
    borderBottom: active ? '2px solid #25D366' : '2px solid transparent',
    marginBottom: -2,
  });

  const WA_GREEN = '#25D366';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: WA_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div>
          <h2 style={{ margin: 0 }}>WhatsApp Messaging</h2>
          <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Send reminders, prescriptions and follow-ups directly to patients</p>
        </div>
      </div>

      {msg && <div className="success-banner" style={{ marginBottom: 16 }}>{msg}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 20 }}>
        <button style={tabStyle(tab === 'setup')}     onClick={() => setTab('setup')}>⚙️ Setup</button>
        <button style={tabStyle(tab === 'templates')} onClick={() => setTab('templates')}>📝 Message Templates</button>
        <button style={tabStyle(tab === 'logs')}      onClick={() => setTab('logs')}>📊 Message Logs</button>
      </div>

      {/* ── Setup tab ── */}
      {tab === 'setup' && (
        <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* How it works */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontWeight: 600, color: '#166534', marginBottom: 8, fontSize: 14 }}>How WhatsApp messaging works</div>
            <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.7 }}>
              This uses <strong>WhatsApp wa.me links</strong> — free, no API key needed. When you click "Send" on any patient message (appointment reminder, prescription, follow-up), it opens WhatsApp on your device with the message pre-filled and the patient's number ready. You just tap Send.
            </div>
          </div>

          {/* Clinic number */}
          <div className="card">
            <div className="card-header"><h2>Your WhatsApp Number</h2></div>
            <div className="card-body">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                This is the clinic's WhatsApp number. It appears as the contact number in messages sent to patients.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={config.countryCode} onChange={e => setConfig(c => ({...c, countryCode: e.target.value}))} style={{ width: 90 }}>
                  <option value="91">+91 IN</option>
                  <option value="1">+1 US</option>
                  <option value="44">+44 UK</option>
                  <option value="971">+971 UAE</option>
                  <option value="65">+65 SG</option>
                </select>
                <input
                  type="tel"
                  value={config.waNumber}
                  onChange={e => setConfig(c => ({...c, waNumber: e.target.value}))}
                  placeholder="9876543210"
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>

          {/* Enable toggles */}
          <div className="card">
            <div className="card-header"><h2>Message Types</h2></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'enableReminders',     label: 'Appointment Reminders',  desc: 'Show WhatsApp button on Appointments page' },
                { key: 'enablePrescriptions', label: 'Prescription Sharing',   desc: 'Show Share Rx button on Prescriptions page' },
                { key: 'enableFollowups',     label: 'Follow-up Reminders',    desc: 'Show Remind button on Follow-ups page' },
                { key: 'enableReports',       label: 'Report Ready Alerts',    desc: 'Manual send from patient profile' },
                { key: 'enablePayments',      label: 'Payment Reminders',      desc: 'Show on unpaid invoices' },
              ].map(item => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                  <label style={{ position: 'relative', width: 40, height: 22, cursor: 'pointer', flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={config[item.key]}
                      onChange={e => setConfig(c => ({...c, [item.key]: e.target.checked}))}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', inset: 0, borderRadius: 11,
                      background: config[item.key] ? WA_GREEN : 'var(--border)',
                      transition: 'background 0.2s',
                    }} />
                    <span style={{
                      position: 'absolute', top: 3, left: config[item.key] ? 21 : 3,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Test message */}
          <div className="card">
            <div className="card-header"><h2>🧪 Send Test Message</h2></div>
            <div className="card-body">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                Send a test message to verify WhatsApp is working from your device.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  placeholder="Patient or your own number"
                  style={{ flex: 1 }}
                />
                <button
                  className="btn"
                  style={{ background: WA_GREEN, color: '#fff', border: 'none', whiteSpace: 'nowrap' }}
                  onClick={sendTestMessage}
                  disabled={testSending || !testPhone.trim()}
                >
                  {testSending ? 'Opening…' : '📲 Test'}
                </button>
              </div>
            </div>
          </div>

          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={saveConfig}>
            Save WhatsApp Settings
          </button>
        </div>
      )}

      {/* ── Templates tab ── */}
      {tab === 'templates' && (
        <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
            These are the message templates used when sending WhatsApp messages from the app. They are pre-filled automatically — you can review them here.
          </p>
          {TEMPLATES.map(t => (
            <div key={t.id} className="card">
              <div
                className="card-header"
                style={{ cursor: 'pointer' }}
                onClick={() => openTemplate(t)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.description}</div>
                  </div>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>{activeTemplate?.id === t.id ? '▲' : '▼'}</span>
              </div>
              {activeTemplate?.id === t.id && (
                <div className="card-body">
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-main)', padding: '14px 16px', borderRadius: 8, lineHeight: 1.7, margin: 0 }}>
                    {t.preview(clinicName)}
                  </pre>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
                    Fields in [brackets] are filled automatically from patient data.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Logs tab ── */}
      {tab === 'logs' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{logsTotal} messages sent</p>
            <button className="btn btn-secondary btn-sm" onClick={loadLogs}>↻ Refresh</button>
          </div>
          <div className="card">
            <div className="table-container">
              {loadingLogs ? <div className="loading"><div className="spinner"></div></div> : (
                <table>
                  <thead>
                    <tr><th>Patient</th><th>Phone</th><th>Type</th><th>Message</th><th>Sent</th></tr>
                  </thead>
                  <tbody>
                    {!logs.length && (
                      <tr><td colSpan={5}>
                        <div className="empty-state"><div className="icon">📲</div><p>No messages sent yet — they appear here after you send via WhatsApp buttons</p></div>
                      </td></tr>
                    )}
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td><strong>{log.patientName || '—'}</strong></td>
                        <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{log.patientPhone}</td>
                        <td><span className="badge badge-info" style={{ fontSize: 11, textTransform: 'capitalize' }}>{(log.messageType || '').replace('_', ' ')}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 260 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.messageBody?.slice(0, 80)}{log.messageBody?.length > 80 ? '…' : ''}
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
