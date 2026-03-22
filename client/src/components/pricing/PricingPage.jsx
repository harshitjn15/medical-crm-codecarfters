import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/bot/plans').then(r => r.json()).then(d => { setPlans(d.plans || []); setLoading(false); });
  }, []);

  const fmt = n => new Intl.NumberFormat('en-IN').format(n);

  if (loading) return <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center' }}><div className="spinner"></div></div>;

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-main)' }}>
      {/* Header */}
      <div style={{ textAlign:'center', padding:'56px 20px 40px' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:'5px 14px', fontSize:12, color:'var(--text-muted)', marginBottom:20 }}>
          🏥 Medical CRM — Simple, transparent pricing
        </div>
        <h1 style={{ fontSize:36, fontWeight:700, margin:'0 0 12px' }}>One price. No surprises.</h1>
        <p style={{ color:'var(--text-secondary)', fontSize:16, maxWidth:480, margin:'0 auto' }}>
          Everything your clinic needs to run smoothly and grow — including an automated WhatsApp bot on Pro &amp; Enterprise.
        </p>
      </div>

      {/* Plan cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px,1fr))', gap:20, maxWidth:980, margin:'0 auto', padding:'0 20px 60px' }}>
        {plans.map(plan => (
          <div key={plan.id} style={{
            background:'var(--bg-card)',
            border: plan.popular ? '2px solid var(--primary)' : '1px solid var(--border)',
            borderRadius:16,
            padding:'28px 24px',
            position:'relative',
          }}>
            {plan.popular && (
              <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'var(--primary)', color:'#fff', fontSize:12, fontWeight:700, padding:'4px 16px', borderRadius:20, whiteSpace:'nowrap' }}>
                Most Popular
              </div>
            )}

            <div style={{ marginBottom:4, fontSize:13, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{plan.name}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:4 }}>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>₹</span>
              <span style={{ fontSize:36, fontWeight:800, color:'var(--text-primary)' }}>{fmt(plan.price)}</span>
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>per year · billed annually</div>
            <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>{plan.tagline}</div>

            <button
              className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
              style={{ width:'100%', marginBottom:24 }}
              onClick={() => navigate('/login')}
            >
              {plan.popular ? 'Get Started — Most Popular' : `Start with ${plan.name}`}
            </button>

            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>What's included</div>
            <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:16 }}>
              {plan.highlights.map((h, i) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:13, color:'var(--text-primary)' }}>
                  <span style={{ color:'#16a34a', flexShrink:0, marginTop:1 }}>✓</span>
                  {h}
                </div>
              ))}
            </div>

            {plan.notIncluded.length > 0 && (
              <>
                <div style={{ height:1, background:'var(--border)', margin:'12px 0' }} />
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {plan.notIncluded.map((h, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:13, color:'var(--text-muted)' }}>
                      <span style={{ flexShrink:0, marginTop:1 }}>✕</span>
                      {h}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ maxWidth:640, margin:'0 auto', padding:'0 20px 60px' }}>
        <h2 style={{ textAlign:'center', marginBottom:24, fontSize:22 }}>Common questions</h2>
        {[
          ['What is the WhatsApp Bot?', 'On Pro and Enterprise, the bot automatically sends appointment reminders 24h before, follow-up reminders on the due date, review requests after an appointment is completed, and responds with your clinic location when a patient messages "LOCATION". It runs 24/7 on a dedicated number.'],
          ['Can I switch plans anytime?', 'Yes. Contact us and we\'ll upgrade or downgrade your plan. The difference is prorated.'],
          ['What happens when my subscription expires?', 'Your data is safe. Bot automation pauses and you revert to Basic features until you renew.'],
          ['Do I need a WhatsApp Business account?', 'For Pro/Enterprise, you need either a phone number to register as a WhatsApp Business account (free) or use the WhatsApp Cloud API (Meta) for higher volumes. We handle the setup during onboarding.'],
          ['Is there a free trial?', 'Yes — all new clinics get a 14-day free trial of the Pro plan.'],
        ].map(([q, a]) => (
          <div key={q} style={{ marginBottom:16, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 18px' }}>
            <div style={{ fontWeight:600, fontSize:14, marginBottom:6 }}>{q}</div>
            <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7 }}>{a}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ textAlign:'center', padding:'0 20px 60px' }}>
        <p style={{ color:'var(--text-muted)', fontSize:14, marginBottom:12 }}>Questions? WhatsApp us directly</p>
        <a href="https://wa.me/918264171623?text=Hi, I'd like to know more about Medical CRM pricing" target="_blank" rel="noreferrer"
          style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#25D366', color:'#fff', borderRadius:8, padding:'10px 20px', textDecoration:'none', fontSize:14, fontWeight:600 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Chat on WhatsApp
        </a>
      </div>
    </div>
  );
}
