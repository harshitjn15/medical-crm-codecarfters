import React, { useState } from 'react';

/**
 * WhatsAppSetup
 * Shown to super admin right after a new clinic is onboarded.
 * Generates a ready-to-share WhatsApp setup message for the clinic admin.
 *
 * Props:
 *   clinicName   - name of the newly created clinic
 *   clinicSlug   - slug (used in booking URL)
 *   adminUsername - the admin account just created
 *   adminPassword - the password just set
 *   loginUrl      - base URL for admin login
 *   onDone        - callback when admin dismisses
 */
export default function WhatsAppSetup({ clinicName, clinicSlug, adminUsername, adminPassword, loginUrl, onDone }) {
  const [copied, setCopied] = useState(false);
  const [sent,   setSent]   = useState(false);
  const [customPhone, setCustomPhone] = useState('');

  const bookingUrl = `${loginUrl || window.location.origin}/book?clinic=${clinicSlug}`;
  const adminLoginUrl = `${loginUrl || window.location.origin}/login`;

  // The onboarding WhatsApp message the super admin sends to the clinic owner
  const onboardMessage =
`👋 Welcome to *Medical CRM* — your clinic is ready!

🏥 *Clinic:* ${clinicName}
🔗 *Booking page:* ${bookingUrl}

*Admin Login Details*
👤 Username: \`${adminUsername}\`
🔑 Password: \`${adminPassword}\`
🖥️ Login at: ${adminLoginUrl}

*Getting Started (3 steps)*
1️⃣ Login and go to *Settings → Clinic Info* to update your clinic details
2️⃣ Go to *Settings → ⚡ Seed Procedures* to load your specialty's default procedures
3️⃣ Share your booking link with patients so they can book online 📅

Need help? Reply to this message anytime.

_Powered by Medical CRM_`;

  const handleCopy = () => {
    navigator.clipboard.writeText(onboardMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    if (!customPhone.trim()) return;
    const digits  = customPhone.replace(/\D/g, '');
    const cleaned = digits.length === 10 ? `91${digits}` : digits;
    const url     = `https://wa.me/${cleaned}?text=${encodeURIComponent(onboardMessage)}`;
    window.open(url, '_blank');
    setSent(true);
  };

  return (
    <div style={{ maxWidth: 660 }}>
      {/* Success header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:44, height:44, borderRadius:'50%', background:'#d8f3dc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>✓</div>
        <div>
          <h2 style={{ margin:0, fontSize:18 }}>Clinic onboarded — <span style={{ color:'var(--primary)' }}>{clinicName}</span></h2>
          <p style={{ margin:'4px 0 0', color:'var(--text-muted)', fontSize:13 }}>Send the setup message to the clinic owner via WhatsApp</p>
        </div>
      </div>

      {/* Message preview */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header">
          <h2>📋 Onboarding Message Preview</h2>
          <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
        <div className="card-body">
          <pre style={{ whiteSpace:'pre-wrap', fontFamily:'var(--font)', fontSize:13, color:'var(--text-primary)', background:'var(--bg-main)', padding:'14px 16px', borderRadius:8, lineHeight:1.7, margin:0 }}>
            {onboardMessage}
          </pre>
        </div>
      </div>

      {/* Send via WhatsApp */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header"><h2>📲 Send via WhatsApp</h2></div>
        <div className="card-body">
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:14 }}>
            Enter the clinic owner's WhatsApp number to open a pre-filled chat directly.
          </p>
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ flex:1, position:'relative' }}>
              <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:13, pointerEvents:'none' }}>+91</span>
              <input
                type="tel"
                value={customPhone}
                onChange={e => setCustomPhone(e.target.value)}
                placeholder="9876543210"
                style={{ paddingLeft:40 }}
                onKeyDown={e => e.key === 'Enter' && handleWhatsApp()}
              />
            </div>
            <button
              className="btn"
              style={{ background:'#25D366', color:'#fff', border:'none', display:'flex', alignItems:'center', gap:8, whiteSpace:'nowrap' }}
              onClick={handleWhatsApp}
              disabled={!customPhone.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Send on WhatsApp
            </button>
          </div>
          {sent && (
            <p style={{ marginTop:10, fontSize:13, color:'var(--success)' }}>
              ✓ WhatsApp opened — complete sending from your device.
            </p>
          )}
        </div>
      </div>

      {/* Booking link quick copy */}
      <div className="card" style={{ marginBottom:24 }}>
        <div className="card-header"><h2>🔗 Booking Link</h2></div>
        <div className="card-body">
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <code style={{ background:'#f1f5f9', padding:'8px 14px', borderRadius:6, flex:1, fontSize:13 }}>{bookingUrl}</code>
            <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(bookingUrl); }}>Copy</button>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button className="btn btn-primary" onClick={onDone}>Done — Go to Clinic List →</button>
      </div>
    </div>
  );
}
