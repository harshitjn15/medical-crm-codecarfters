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
app.use(cors({
  origin: isProd
    ? false                                          // same-origin, no CORS header needed
    : ['http://localhost:3000', 'https://medical-crm-codecrafters.netlify.app'],
  credentials: true,
}));

app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/followups', require('./routes/followups'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/clinics', require('./routes/clinics'));
app.use('/api/clinic', require('./routes/clinic'));
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/website', require('./routes/website'));
app.use('/api/vitals', require('./routes/vitals'));
app.use('/api/clinicalnotes', require('./routes/clinicalnotes'));
app.use('/api/treatmentplans', require('./routes/treatmentplans'));
app.use('/api/procedures', require('./routes/procedures'));
app.use('/api/dental', require('./routes/dental'));
app.use('/api/files', require('./routes/files'));
app.use('/api/invoicetemplate', require('./routes/invoicetemplate'));

// Serve React build in production — must come AFTER all /api routes

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV,
  });
});

if (isProd) {
  const buildPath = path.join(__dirname, '../client/build');
  app.use(express.static(buildPath));
  // For React Router — send index.html for any non-API route
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  if (!isProd) console.log('Login: admin / admin123');
});
