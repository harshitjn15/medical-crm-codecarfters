require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const connectDB = require('./database/connect');

const app  = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

connectDB();

// CORS — in production the client is served from the same origin so no CORS needed
// In dev allow localhost:3000
app.use(cors({ origin: ['http://localhost:3000','https://medical-crm-codecrafters.netlify.app'], credentials: true }));

app.use(express.json());

// ── API Routes ─────────────────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/patients',       require('./routes/patients'));
app.use('/api/appointments',   require('./routes/appointments'));
app.use('/api/prescriptions',  require('./routes/prescriptions'));
app.use('/api/followups',      require('./routes/followups'));
app.use('/api/invoices',       require('./routes/invoices'));
app.use('/api/clinics',        require('./routes/clinics'));
app.use('/api/clinic',         require('./routes/clinic'));
app.use('/api/superadmin',     require('./routes/superadmin'));
app.use('/api/whatsapp',       require('./routes/whatsapp'));
app.use('/api/website',        require('./routes/website'));
app.use('/api/vitals',         require('./routes/vitals'));
app.use('/api/clinicalnotes',  require('./routes/clinicalnotes'));
app.use('/api/treatmentplans', require('./routes/treatmentplans'));
app.use('/api/procedures',     require('./routes/procedures'));
app.use('/api/dental',         require('./routes/dental'));
app.use('/api/files',          require('./routes/files'));
app.use('/api/invoicetemplate',require('./routes/invoicetemplate'));

// ── New SaaS routes ────────────────────────────────────────────────────
app.use('/api/bot',            require('./routes/bot'));
app.use('/api/subscriptions',  require('./routes/subscriptions'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV, version: '4.0.0' }));

// ── Production static serving ──────────────────────────────────────────
if (isProd) {
  const build = path.join(__dirname, '../client/build');
  app.use(express.static(build));
  app.get('*', (req, res) => res.sendFile(path.join(build, 'index.html')));
}

app.listen(PORT, async () => {
  console.log(`Server on :${PORT} [${process.env.NODE_ENV || 'dev'}]`);

  // Start bot scheduler after server is ready
  try {
    const { startScheduler } = require('./bot/scheduler');
    startScheduler();
  } catch (err) {
    console.error('[scheduler] Failed to start:', err.message);
  }
});
