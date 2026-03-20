const mongoose = require('mongoose');

// ── Global toJSON transform ───────────────────────────────────────────────
// Converts _id → id on all top-level documents.
// Safely skips subdocuments that have { _id: false } (e.g. MedicationSchema,
// InvoiceItemSchema) — calling .toString() on undefined _id would throw 500.
mongoose.plugin(schema => {
  schema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
      if (ret._id !== undefined) {
        ret.id = ret._id.toString();
        delete ret._id;
      }
      delete ret.__v;
      return ret;
    }
  });
});

// ── Clinic ────────────────────────────────────────────────────────────────
const ClinicSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  slug:        { type: String, required: true, unique: true, lowercase: true },
  address:     String,
  phone:       String,
  email:       String,
  logoUrl:     String,
  tagline:     String,
  gstNumber:   String,
  currency:    { type: String, default: 'INR' },
  plan:        { type: String, enum: ['basic', 'pro', 'enterprise'], default: 'basic' },
  specialty:   { type: String, enum: ['general','dental','dermatology','cardiology','orthopedics','ent','gynecology','pediatrics','ophthalmology','neurology','psychiatry'], default: 'general' },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

// ── User ──────────────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  clinicId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  username:  { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  email:     String,
  role:      { type: String, enum: ['super_admin', 'admin', 'staff'], default: 'admin' },
  phone:     String,
}, { timestamps: true });

// ── Patient ───────────────────────────────────────────────────────────────
const PatientSchema = new mongoose.Schema({
  clinicId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  name:           { type: String, required: true },
  phone:          String,
  email:          String,
  dateOfBirth:    String,
  gender:         String,
  address:        String,
  bloodGroup:     String,
  allergies:      String,
  medicalHistory: String,
}, { timestamps: true });

PatientSchema.index({ clinicId: 1, name: 1 });
PatientSchema.index({ clinicId: 1, phone: 1 });

// ── Appointment ───────────────────────────────────────────────────────────
const AppointmentSchema = new mongoose.Schema({
  clinicId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  patientId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  patientName:     { type: String, required: true },
  patientPhone:    String,
  patientEmail:    String,
  appointmentDate: { type: String, required: true },
  appointmentTime: { type: String, required: true },
  reason:          String,
  status:          { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  notes:           String,
}, { timestamps: true });

AppointmentSchema.index({ clinicId: 1, appointmentDate: 1 });

// ── Prescription ──────────────────────────────────────────────────────────
const MedicationSchema = new mongoose.Schema({
  name:      String,
  dosage:    String,
  frequency: String,
  duration:  String,
}, { _id: false });

const PrescriptionSchema = new mongoose.Schema({
  clinicId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  patientId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  diagnosis:    String,
  medications:  [MedicationSchema],
  instructions: String,
  notes:        String,
}, { timestamps: true });

PrescriptionSchema.index({ clinicId: 1, patientId: 1 });

// ── Followup ──────────────────────────────────────────────────────────────
const FollowupSchema = new mongoose.Schema({
  clinicId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  patientId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
  followupDate:   { type: String, required: true },
  followupType:   { type: String, default: 'checkup' },
  notes:          String,
  status:         { type: String, enum: ['pending', 'completed'], default: 'pending' },
}, { timestamps: true });

FollowupSchema.index({ clinicId: 1, followupDate: 1, status: 1 });

// ── Invoice ───────────────────────────────────────────────────────────────
const InvoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  category:    { type: String, enum: ['service', 'medicine', 'procedure', 'lab'], default: 'service' },
  quantity:    { type: Number, default: 1 },
  unitPrice:   { type: Number, default: 0 },
  amount:      { type: Number, default: 0 },
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
  clinicId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  patientId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointmentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  invoiceNumber:  { type: String, required: true },
  issueDate:      { type: String, default: () => new Date().toISOString().split('T')[0] },
  dueDate:        String,
  status:         { type: String, enum: ['draft', 'sent', 'paid', 'cancelled'], default: 'draft' },
  items:          [InvoiceItemSchema],
  subtotal:       { type: Number, default: 0 },
  discount:       { type: Number, default: 0 },
  taxRate:        { type: Number, default: 18 },
  taxAmount:      { type: Number, default: 0 },
  total:          { type: Number, default: 0 },
  notes:          String,
  paidAt:         Date,
  paymentMethod:  String,
}, { timestamps: true });

InvoiceSchema.index({ clinicId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ clinicId: 1, patientId: 1 });

// ── Clinic Website ────────────────────────────────────────────────────────
const ClinicWebsiteSchema = new mongoose.Schema({
  clinicId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true, unique: true },
  heroTitle:    String,
  heroSubtitle: String,
  primaryColor: { type: String, default: '#0f4c75' },
  services:     { type: [String], default: ['General Consultation', 'Follow-up Visits', 'Prescription Management', 'Health Check-ups'] },
  workingHours: { type: String, default: 'Mon–Sat: 9:00 AM – 6:00 PM' },
  aboutText:    String,
  showMap:      { type: Boolean, default: false },
  mapEmbed:     String,
}, { timestamps: true });

// ── WhatsApp Log ──────────────────────────────────────────────────────────
const WhatsappLogSchema = new mongoose.Schema({
  clinicId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  patientName:  String,
  patientPhone: { type: String, required: true },
  messageType:  { type: String, required: true },
  messageBody:  { type: String, required: true },
}, { timestamps: true });

WhatsappLogSchema.index({ clinicId: 1, createdAt: -1 });

// ── VitalSigns ────────────────────────────────────────────────────────
const VitalSignsSchema = new mongoose.Schema({
  clinicId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  patientId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  recordedAt:    { type: String, default: () => new Date().toISOString().split('T')[0] },
  bpSystolic:    Number,
  bpDiastolic:   Number,
  pulse:         Number,
  temperature:   Number,
  tempUnit:      { type: String, enum: ['C', 'F'], default: 'C' },
  weight:        Number,
  height:        Number,
  bmi:           Number,
  spo2:          Number,
  bloodSugar:    Number,
  bloodSugarType:{ type: String, enum: ['fasting', 'random', 'post_meal'], default: 'random' },
  respiratoryRate: Number,
  notes:         String,
}, { timestamps: true });

VitalSignsSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });

// ── ClinicalNote (SOAP) ───────────────────────────────────────────────
const ClinicalNoteSchema = new mongoose.Schema({
  clinicId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  patientId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  noteDate:      { type: String, default: () => new Date().toISOString().split('T')[0] },
  subjective:    String,
  objective:     String,
  assessment:    String,
  plan:          String,
  chiefComplaint:String,
  doctorName:    String,
  specialty:     String,
  tags:          [String],
}, { timestamps: true });

ClinicalNoteSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });

// ── TreatmentPlan ─────────────────────────────────────────────────────
const TreatmentItemSchema = new mongoose.Schema({
  procedure:     { type: String, required: true },
  toothNumber:   String,
  estimatedCost: { type: Number, default: 0 },
  status:        { type: String, enum: ['planned', 'in_progress', 'completed', 'cancelled'], default: 'planned' },
  notes:         String,
  completedAt:   String,
  sortOrder:     { type: Number, default: 0 },
}, { _id: false });

const TreatmentPlanSchema = new mongoose.Schema({
  clinicId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  patientId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  title:         { type: String, required: true },
  items:         [TreatmentItemSchema],
  totalEstimate: { type: Number, default: 0 },
  status:        { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  notes:         String,
  startDate:     String,
  endDate:       String,
}, { timestamps: true });

TreatmentPlanSchema.index({ clinicId: 1, patientId: 1 });

// ── Procedure Library ─────────────────────────────────────────────────
const ProcedureSchema = new mongoose.Schema({
  clinicId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  name:         { type: String, required: true },
  category:     { type: String, required: true },
  defaultPrice: { type: Number, default: 0 },
  duration:     Number,
  specialty:    String,
  description:  String,
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

ProcedureSchema.index({ clinicId: 1, isActive: 1 });

// ── DentalChart ───────────────────────────────────────────────────────
const ToothSchema = new mongoose.Schema({
  toothNumber: { type: Number, required: true },
  status:      { type: String, enum: ['healthy','decayed','filled','crown','extracted','root_canal','implant','bridge','missing','under_treatment'], default: 'healthy' },
  surfaces:    [{ type: String, enum: ['mesial','distal','buccal','lingual','occlusal','incisal'] }],
  notes:       String,
  treatedAt:   String,
}, { _id: false });

const DentalChartSchema = new mongoose.Schema({
  clinicId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, unique: false },
  teeth:     [ToothSchema],
  lastUpdated: { type: String, default: () => new Date().toISOString().split('T')[0] },
}, { timestamps: true });

DentalChartSchema.index({ clinicId: 1, patientId: 1 }, { unique: true });


// ── PatientFile ───────────────────────────────────────────────────────
const PatientFileSchema = new mongoose.Schema({
  clinicId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  patientId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  filename:    { type: String, required: true },
  originalName:{ type: String, required: true },
  mimetype:    { type: String, required: true },
  size:        { type: Number, required: true },
  data:        { type: String, required: true }, // base64
  category:    { type: String, enum: ['lab_report','xray','scan','prescription','insurance','other'], default: 'other' },
  notes:       String,
}, { timestamps: true });
PatientFileSchema.index({ clinicId: 1, patientId: 1 });

// ── OtpCode ───────────────────────────────────────────────────────────
const OtpCodeSchema = new mongoose.Schema({
  phone:     { type: String, required: true },
  clinicId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic' },
  code:      { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used:      { type: Boolean, default: false },
}, { timestamps: true });
OtpCodeSchema.index({ phone: 1, expiresAt: 1 });

// ── InvoiceTemplate ───────────────────────────────────────────────────
const InvoiceTemplateSchema = new mongoose.Schema({
  clinicId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true, unique: true },
  layout:         { type: String, enum: ['classic','modern','minimal'], default: 'classic' },
  logoData:       String, // base64 image
  logoName:       String,
  primaryColor:   { type: String, default: '#0f4c75' },
  headerNote:     String, // e.g. "Reg No: MH/1234" or custom header text
  footerNote:     String, // e.g. "Payment due within 30 days"
  showGst:        { type: Boolean, default: true },
  showDoctorName: { type: Boolean, default: true },
  doctorName:     String,
  doctorDegree:   String, // e.g. "BDS, MDS"
  regNumber:      String,
}, { timestamps: true });

module.exports = {
  Clinic:        mongoose.model('Clinic',        ClinicSchema),
  User:          mongoose.model('User',          UserSchema),
  Patient:       mongoose.model('Patient',       PatientSchema),
  Appointment:   mongoose.model('Appointment',   AppointmentSchema),
  Prescription:  mongoose.model('Prescription',  PrescriptionSchema),
  Followup:      mongoose.model('Followup',      FollowupSchema),
  Invoice:       mongoose.model('Invoice',       InvoiceSchema),
  ClinicWebsite: mongoose.model('ClinicWebsite', ClinicWebsiteSchema),
  WhatsappLog:     mongoose.model('WhatsappLog',     WhatsappLogSchema),
  PatientFile:     mongoose.model('PatientFile',     PatientFileSchema),
  OtpCode:         mongoose.model('OtpCode',         OtpCodeSchema),
  InvoiceTemplate: mongoose.model('InvoiceTemplate', InvoiceTemplateSchema),
  VitalSigns:    mongoose.model('VitalSigns',    VitalSignsSchema),
  ClinicalNote:  mongoose.model('ClinicalNote',  ClinicalNoteSchema),
  TreatmentPlan: mongoose.model('TreatmentPlan', TreatmentPlanSchema),
  Procedure:     mongoose.model('Procedure',     ProcedureSchema),
  DentalChart:   mongoose.model('DentalChart',   DentalChartSchema),
};
