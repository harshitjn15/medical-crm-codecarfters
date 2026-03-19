import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Public.css';

export default function PublicHome() {
  const navigate = useNavigate(); const [searchParams] = useSearchParams();
  const clinicSlug = searchParams.get('clinic') || 'default';
  const [ws, setWs] = useState(null); // website settings

  useEffect(() => {
    fetch(`/api/website/public?clinic=${clinicSlug}`)
      .then(r=>r.json()).then(d=>{ if (!d.error) setWs(d); });
  }, [clinicSlug]);

  if (!ws) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><div className="spinner"></div></div>;

  const primary = ws.primary_color || '#0f4c75';
  const clinic = ws.clinic || {};

  return (
    <div className="public-page">
      <style>{`:root { --pub-primary: ${primary}; }`}</style>

      {/* Nav */}
      <nav className="public-nav" style={{ borderBottom:`3px solid ${primary}` }}>
        <div className="nav-brand" style={{ color:primary }}>🏥 {clinic.name}</div>
        <div className="nav-links">
          <a href="#services">Services</a>
          {ws.about_text && <a href="#about">About</a>}
          <a href="#contact">Contact</a>
          <button className="btn btn-secondary btn-sm" onClick={()=>navigate('/login')}>Staff Login</button>
          <button className="btn btn-primary btn-sm" style={{ background:primary }} onClick={()=>navigate(`/book?clinic=${clinicSlug}`)}>Book Appointment</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1 style={{ color:primary }}>{ws.hero_title || clinic.name}</h1>
          {ws.hero_subtitle && <p className="hero-tagline" style={{ color:primary }}>{ws.hero_subtitle}</p>}
          <p className="hero-sub">Book appointments online and manage your health journey with us.</p>
          <div className="hero-btns">
            <button className="btn btn-primary hero-btn" style={{ background:primary }} onClick={()=>navigate(`/book?clinic=${clinicSlug}`)}>📅 Book Appointment</button>
            <a href="#contact" className="btn btn-secondary hero-btn">📞 Contact Us</a>
          </div>
        </div>
        <div className="hero-visual">
          {[['🩺','Online Booking','Available 24/7'],['💊','Digital Prescriptions','Always accessible'],['📋','Medical Records','Securely stored']].map(([icon,title,sub]) => (
            <div className="hero-card" key={title}><div className="hc-icon">{icon}</div><div><div className="hc-title">{title}</div><div className="hc-sub">{sub}</div></div></div>
          ))}
        </div>
      </section>

      {/* Services */}
      {ws.services?.length > 0 && (
        <section className="services-section" id="services" style={{ background:primary }}>
          <h2>Our Services</h2>
          <div className="services-grid">
            {ws.services.map(s => <div className="service-card" key={s}><div className="service-icon">✦</div><div className="service-name">{s}</div></div>)}
          </div>
        </section>
      )}

      {/* About */}
      {ws.about_text && (
        <section style={{ padding:'56px 48px', maxWidth:900, margin:'0 auto', textAlign:'center' }} id="about">
          <h2 style={{ color:primary, marginBottom:16 }}>About Us</h2>
          <p style={{ fontSize:16, color:'var(--text-secondary)', lineHeight:1.8 }}>{ws.about_text}</p>
        </section>
      )}

      {/* Map */}
      {ws.show_map && ws.map_embed && (
        <section style={{ padding:'0 48px 40px' }}>
          <iframe src={ws.map_embed} width="100%" height="340" style={{ border:0, borderRadius:12 }} allowFullScreen loading="lazy" title="Clinic location" />
        </section>
      )}

      {/* Contact */}
      <section className="contact-section" id="contact">
        <h2 style={{ color:primary }}>Get In Touch</h2>
        <div className="contact-grid">
          {clinic.address && <div className="contact-item"><span className="ci-icon">📍</span><div><div className="ci-label">Address</div><div>{clinic.address}</div></div></div>}
          {clinic.phone   && <div className="contact-item"><span className="ci-icon">📞</span><div><div className="ci-label">Phone</div><div>{clinic.phone}</div></div></div>}
          {clinic.email   && <div className="contact-item"><span className="ci-icon">✉️</span><div><div className="ci-label">Email</div><div>{clinic.email}</div></div></div>}
          <div className="contact-item"><span className="ci-icon">🕐</span><div><div className="ci-label">Hours</div><div>{ws.working_hours}</div></div></div>
        </div>
        <button className="btn btn-primary" style={{ marginTop:28, background:primary }} onClick={()=>navigate(`/book?clinic=${clinicSlug}`)}>Book Your Appointment →</button>
      </section>

      <footer className="public-footer"><p>© {new Date().getFullYear()} {clinic.name}. All rights reserved.</p></footer>
    </div>
  );
}
