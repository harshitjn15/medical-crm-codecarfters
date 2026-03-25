import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

/**
 * Reusable WhatsApp share button.
 * Uses wa.me links - free, no API key needed.
 * Opens WhatsApp with pre-filled message on user's device.
 *
 * Props:
 *   phone        - patient phone number (with or without country code)
 *   message      - pre-filled message text
 *   type         - log type: 'prescription' | 'appointment_reminder' | 'followup_reminder' | 'confirmation'
 *   patientName  - for logging
 *   label        - button label (default: 'Send WhatsApp')
 *   size         - 'sm' | 'md' (default md)
 */
export default function WhatsAppButton({ phone, message, type, patientName, label, size = 'md' }) {
  const { authFetch } = useContext(AuthContext);

  if (!phone) return null;

  // Clean phone: remove spaces, dashes; add country code if not present
  const cleanPhone = (p) => {
    const digits = p.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length >= 12) return digits;
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  const handleClick = async () => {
    const cleaned = cleanPhone(phone);
    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleaned}?text=${encoded}`;

    // Log the message
    try {
      await authFetch('/api/whatsapp/log', {
        method: 'POST',
        body: JSON.stringify({ patient_name: patientName, patient_phone: phone, message_type: type || 'general', message_body: message })
      });
    } catch {}

    window.open(waUrl, '_blank');
  };

  const btnClass = size === 'sm' ? 'btn btn-sm' : 'btn';

  return (
    <button
      className={btnClass}
      onClick={handleClick}
      style={{ background:'#25D366', color:'#fff', border:'none', display:'inline-flex', alignItems:'center', justifyContent:'center', padding: size === 'sm' ? 6 : 8, borderRadius: 6 }}
      title={`Send WhatsApp to ${phone}`}
    >
      <svg width={size === 'sm' ? "14" : "18"} height={size === 'sm' ? "14" : "18"} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </button>
  );
}


/**
 * Helper: build WhatsApp message for prescription
 */
export function buildPrescriptionMessage(clinicName, clinicPhone, patientName, diagnosis, medications) {
  const medList = Array.isArray(medications)
    ? medications.map(m => `• ${m.name}${m.dosage ? ` — ${m.dosage}` : ''}${m.frequency ? `, ${m.frequency}` : ''}${m.duration ? ` for ${m.duration}` : ''}`).join('\n')
    : (medications || 'As prescribed');

  return `Hi ${patientName},\n\nYour prescription from *${clinicName}*:\n\n*Diagnosis:* ${diagnosis || 'As discussed'}\n\n*Medications:*\n${medList}\n\nPlease follow the prescribed dosage. Contact us at ${clinicPhone || 'the clinic'} for any questions.\n\n_${clinicName}_`;
}


/**
 * Helper: build WhatsApp appointment reminder message
 */
export function buildAppointmentReminderMessage(clinicName, clinicPhone, patientName, date, time) {
  return `Hi ${patientName},\n\nReminder from *${clinicName}*:\n\nYou have an appointment on *${date}* at *${time}*.\n\nPlease reply:\n✅ *YES* to confirm\n❌ *NO* to cancel or reschedule\n\nContact: ${clinicPhone || 'the clinic'}\n\n_${clinicName}_`;
}


/**
 * Helper: build follow-up reminder message
 */
export function buildFollowupMessage(clinicName, clinicPhone, patientName, date, type) {
  return `Hi ${patientName},\n\n*${clinicName}* would like to remind you about your *${type || 'follow-up'}* appointment due on *${date}*.\n\nPlease call us to schedule: ${clinicPhone || 'the clinic'}\n\n_${clinicName}_`;
}
