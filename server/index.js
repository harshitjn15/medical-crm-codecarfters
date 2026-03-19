require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./database/connect');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors({ origin: ['http://localhost:3000','http://localhost:3001'], credentials: true }));
app.use(express.json());

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/patients',     require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/prescriptions',require('./routes/prescriptions'));
app.use('/api/followups',    require('./routes/followups'));
app.use('/api/invoices',     require('./routes/invoices'));
app.use('/api/clinics',      require('./routes/clinics'));
app.use('/api/clinic',       require('./routes/clinic'));
app.use('/api/superadmin',   require('./routes/superadmin'));
app.use('/api/whatsapp',     require('./routes/whatsapp'));
app.use('/api/website',        require('./routes/website'));
app.use('/api/vitals',         require('./routes/vitals'));
app.use('/api/clinicalnotes',  require('./routes/clinicalnotes'));
app.use('/api/treatmentplans', require('./routes/treatmentplans'));
app.use('/api/procedures',     require('./routes/procedures'));
app.use('/api/dental',         require('./routes/dental'));

app.get('/api/health', (req, res) => res.json({ status:'ok', db:'mongodb' }));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname,'../client/build')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname,'../client/build/index.html')));
}

app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
  console.log('Login: admin / admin123');
});
