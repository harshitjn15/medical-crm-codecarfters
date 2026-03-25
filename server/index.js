require('dotenv').config();
const express        = require('express');
const cors           = require('cors');
const path           = require('path');
const helmet         = require('helmet');
const mongoSanitize  = require('express-mongo-sanitize');
const rateLimit      = require('express-rate-limit');
const connectDB      = require('./database/connect');
const errorHandler   = require('./middleware/errorHandler');
const logger         = require('./utils/logger');

const app  = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// ── Security: Fail fast if critical env vars are missing ───────────────
if (!process.env.JWT_SECRET) {
  logger.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}

connectDB();

// ── Security Headers ──────────────────────────────────────────────────
app.use(helmet());

// CORS — in production the client is served from the same origin so no CORS needed
// In dev allow localhost:3000
app.use(cors({ origin: ['http://localhost:3000','https://medical-crm-codecrafters.netlify.app'], credentials: true }));

// ── Body parsing with size limit (prevents DoS via massive payloads) ──
app.use(express.json({ limit: '2mb' }));

// ── NoSQL Injection Prevention ────────────────────────────────────────
app.use(mongoSanitize());

// ── Rate Limiters ─────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

app.use('/api/auth', authLimiter);
app.use('/api/appointments/available-slots', publicLimiter);
app.use('/api/appointments/book', publicLimiter);

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

// ── Centralized Error Handler (must be last middleware) ────────────────
app.use(errorHandler);

app.listen(PORT, async () => {
  logger.info(`Server on :${PORT} [${process.env.NODE_ENV || 'dev'}]`);

  // Auto-init missing SaaS documents for existing and new clinics
  try {
    const { Clinic, Subscription, BotConfig } = require('./models');
    const clinics = await Clinic.find();
    let countSubs = 0, countBots = 0;
    for (const c of clinics) {
      const sub = await Subscription.findOne({ clinicId: c._id });
      if (!sub) {
        await Subscription.create({ clinicId: c._id, plan: c.plan || 'basic', status: 'trial', trialDays: 14 });
        countSubs++;
      }
      const bot = await BotConfig.findOne({ clinicId: c._id });
      if (!bot) {
        // Find existing phone number if available
        const botNumber = String(c.phone || '').replace(/\D/g, '') || undefined;
        await BotConfig.create({ clinicId: c._id, botNumber });
        countBots++;
      }
    }
    if (countSubs > 0 || countBots > 0) {
      logger.info(`[init] Generated ${countSubs} missing subscriptions and ${countBots} missing bot configs.`);
    }
  } catch (err) {
    logger.error(`[init] Failed to init clinic features: ${err.message}`);
  }

  // Start bot scheduler after server is ready
  try {
    const { startScheduler } = require('./bot/scheduler');
    startScheduler();
  } catch (err) {
    logger.error('[scheduler] Failed to start:', { error: err.message });
  }
});
