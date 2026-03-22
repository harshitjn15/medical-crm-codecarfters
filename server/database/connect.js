const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/medical_crm';
    await mongoose.connect(uri);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
    await seedDefaults();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const seedDefaults = async () => {
  const { Clinic, User, ClinicWebsite, Subscription } = require('../models');

  let clinic = await Clinic.findOne({ slug: 'default' });
  if (!clinic) {
    clinic = await Clinic.create({
      name: 'My Clinic', slug: 'default',
      address: '123 Medical Street, Mumbai',
      phone: '022-1234-5678', email: 'admin@myclinic.com',
      tagline: 'Your Health, Our Priority',
      gstNumber: '27AARCA0001A1Z5', plan: 'pro',
      isActive: true,
    });
    console.log('Default clinic created');
    await Subscription.findOneAndUpdate(
      { clinicId: clinic._id },
      { $set: { plan:'pro', status:'trial', trialDays:14, endDate: new Date(Date.now() + 14*24*60*60*1000) } },
      { upsert:true }
    );
    console.log('Default subscription (Pro trial) created');
  }

  const adminExists = await User.findOne({ username: 'admin' });
  if (!adminExists) {
    await User.create({
      clinicId: clinic._id, username: 'admin',
      password: bcrypt.hashSync('admin123', 10),
      email: 'admin@myclinic.com', role: 'super_admin',
    });
    console.log('Default admin created: username=admin password=admin123');
  }

  const wsExists = await ClinicWebsite.findOne({ clinicId: clinic._id });
  if (!wsExists) {
    await ClinicWebsite.create({
      clinicId: clinic._id,
      heroTitle: 'My Clinic',
      heroSubtitle: 'Your Health, Our Priority',
      services: ['General Consultation', 'Follow-up Visits', 'Prescription Management', 'Health Check-ups'],
    });
  }
};

module.exports = connectDB;
