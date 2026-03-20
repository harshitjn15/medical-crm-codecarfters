import React from 'react';

const TEMPLATES = {
  dental: {
    'Chief Complaints': ['Toothache', 'Sensitivity to cold/hot', 'Bleeding gums', 'Swollen gums', 'Bad breath', 'Loose tooth', 'Broken tooth', 'Jaw pain', 'Difficulty chewing'],
    'Diagnosis': ['Dental caries', 'Pulpitis (reversible)', 'Pulpitis (irreversible)', 'Periapical abscess', 'Gingivitis', 'Periodontitis', 'Impacted tooth', 'Fractured tooth', 'Root resorption', 'Dry socket'],
    'Treatment Plan': ['Root canal treatment', 'Composite filling', 'Tooth extraction', 'Scaling & polishing', 'Crown placement', 'Antibiotic therapy', 'Dental X-ray advised', 'OPG required', 'Referral to oral surgeon'],
  },
  dermatology: {
    'Chief Complaints': ['Rash', 'Itching', 'Dry skin', 'Acne breakout', 'Hair loss', 'Nail changes', 'Pigmentation', 'Wound not healing', 'Burning sensation'],
    'Diagnosis': ['Acne vulgaris', 'Eczema (atopic dermatitis)', 'Psoriasis', 'Urticaria (hives)', 'Contact dermatitis', 'Fungal infection', 'Seborrheic dermatitis', 'Vitiligo', 'Melasma', 'Rosacea'],
    'Treatment Plan': ['Topical steroid cream', 'Antifungal therapy', 'Oral antibiotics', 'Moisturiser advised', 'Avoid trigger factors', 'Patch test recommended', 'Skin biopsy advised', 'Chemical peel', 'Laser therapy'],
  },
  cardiology: {
    'Chief Complaints': ['Chest pain', 'Palpitations', 'Shortness of breath', 'Leg swelling', 'Dizziness', 'Syncope (fainting)', 'Fatigue on exertion'],
    'Diagnosis': ['Hypertension', 'Coronary artery disease', 'Arrhythmia', 'Heart failure', 'Angina pectoris', 'Atrial fibrillation', 'Mitral valve prolapse'],
    'Treatment Plan': ['ECG advised', '2D Echo required', 'Stress test (TMT)', 'Holter monitoring', 'Lifestyle modifications', 'Salt restriction', 'Antihypertensive therapy', 'Cardiology referral'],
  },
  orthopedics: {
    'Chief Complaints': ['Joint pain', 'Back pain', 'Swelling of joint', 'Limited range of motion', 'Muscle weakness', 'Numbness / tingling', 'Post-fracture follow-up'],
    'Diagnosis': ['Osteoarthritis', 'Rheumatoid arthritis', 'Lumbar spondylosis', 'Slip disc (PIVD)', 'Rotator cuff injury', 'Tennis elbow', 'Plantar fasciitis', 'Fracture'],
    'Treatment Plan': ['X-Ray advised', 'MRI recommended', 'Physiotherapy sessions', 'Joint injection', 'NSAID therapy', 'Plaster application', 'Activity restriction', 'Orthopedic referral'],
  },
  ent: {
    'Chief Complaints': ['Ear pain', 'Hearing loss', 'Tinnitus', 'Blocked nose', 'Sore throat', 'Hoarseness', 'Nasal discharge', 'Snoring'],
    'Diagnosis': ['Otitis media', 'Sinusitis', 'Tonsillitis', 'Pharyngitis', 'Deviated nasal septum', 'Allergic rhinitis', 'GERD-related laryngitis'],
    'Treatment Plan': ['Ear cleaning', 'Nasal wash advised', 'Audiometry', 'Antibiotic therapy', 'Decongestants', 'Steroid nasal spray', 'ENT referral'],
  },
  gynecology: {
    'Chief Complaints': ['Irregular periods', 'Pelvic pain', 'Vaginal discharge', 'Missed period', 'Heavy bleeding', 'Breast lump', 'Infertility concern'],
    'Diagnosis': ['PCOS', 'Endometriosis', 'Fibroids', 'Ovarian cyst', 'PID', 'Cervical erosion', 'Menopausal syndrome'],
    'Treatment Plan': ['Ultrasound advised', 'Pap smear', 'Hormonal therapy', 'Oral contraceptives', 'Iron supplementation', 'Dietary counselling', 'Gynecology referral'],
  },
  pediatrics: {
    'Chief Complaints': ['Fever', 'Cough and cold', 'Diarrhea', 'Vomiting', 'Poor weight gain', 'Delayed milestones', 'Skin rash', 'Ear pain'],
    'Diagnosis': ['Viral URTI', 'Acute gastroenteritis', 'Bronchiolitis', 'Febrile seizure', 'Otitis media', 'Tonsillitis', 'Anemia', 'Malnutrition'],
    'Treatment Plan': ['ORS advised', 'Vaccination due', 'Growth monitoring', 'Paracetamol for fever', 'Antibiotic therapy', 'Nebulization', 'Pediatric referral'],
  },
  general: {
    'Chief Complaints': ['Fever', 'Headache', 'Body pain', 'Fatigue', 'Cough', 'Nausea / vomiting', 'Diarrhea', 'Chest pain', 'Abdominal pain'],
    'Diagnosis': ['Viral fever', 'Hypertension', 'Diabetes mellitus', 'Anemia', 'Hypothyroidism', 'Migraine', 'Acid reflux (GERD)', 'UTI', 'Respiratory infection'],
    'Treatment Plan': ['CBC, CMP advised', 'Blood sugar monitoring', 'Dietary counselling', 'Hydration advised', 'Antibiotic therapy', 'Physiotherapy', 'Specialist referral'],
  },
  ophthalmology: {
    'Chief Complaints': ['Blurred vision', 'Eye pain', 'Redness', 'Watering eyes', 'Double vision', 'Night blindness', 'Floaters'],
    'Diagnosis': ['Refractive error', 'Cataract', 'Glaucoma', 'Conjunctivitis', 'Diabetic retinopathy', 'Dry eye syndrome'],
    'Treatment Plan': ['Vision test', 'Retinal exam', 'Eye drops prescribed', 'Spectacle prescription', 'Cataract surgery advised', 'Ophthalmology referral'],
  },
  neurology: {
    'Chief Complaints': ['Headache', 'Dizziness', 'Seizure', 'Memory loss', 'Weakness', 'Numbness', 'Tremor', 'Sleep issues'],
    'Diagnosis': ['Migraine', 'Epilepsy', 'Stroke (CVA)', 'Parkinson\'s disease', 'Peripheral neuropathy', 'Multiple sclerosis', 'Tension headache'],
    'Treatment Plan': ['MRI brain advised', 'EEG required', 'CT scan', 'Anti-epileptic therapy', 'Physiotherapy', 'Neurology referral'],
  },
  psychiatry: {
    'Chief Complaints': ['Anxiety', 'Depression', 'Sleep disturbance', 'Mood swings', 'Panic attacks', 'Irritability', 'Loss of appetite'],
    'Diagnosis': ['Major depressive disorder', 'Generalized anxiety disorder', 'Panic disorder', 'OCD', 'Bipolar disorder', 'PTSD', 'Insomnia'],
    'Treatment Plan': ['Counselling advised', 'CBT recommended', 'Antidepressant therapy', 'Sleep hygiene counselling', 'Psychiatry referral', 'Crisis support information'],
  },
};

/**
 * SymptomChips
 * Props:
 *   specialty  - clinic specialty string
 *   field      - 'chiefComplaint' | 'assessment' | 'plan' | 'subjective'
 *   onSelect   - callback(text) — appends chip text to the field
 */
export default function SymptomChips({ specialty = 'general', field, onSelect }) {
  const sp = TEMPLATES[specialty] || TEMPLATES.general;

  // Map field to the right template group
  const groupMap = {
    chiefComplaint: 'Chief Complaints',
    chief_complaint: 'Chief Complaints',
    assessment: 'Diagnosis',
    plan: 'Treatment Plan',
  };

  const group = groupMap[field];
  if (!group || !sp[group]) return null;

  const chips = sp[group];

  return (
    <div style={{ marginTop:6, marginBottom:4 }}>
      <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:5 }}>
        Quick fill
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
        {chips.map(chip => (
          <button
            key={chip}
            type="button"
            onClick={() => onSelect(chip)}
            style={{
              padding:'3px 10px', fontSize:12, border:'1px solid var(--border)',
              borderRadius:20, background:'var(--bg-main)', cursor:'pointer',
              fontFamily:'var(--font)', color:'var(--text-secondary)',
              transition:'all 0.1s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.color = 'var(--primary)'; e.target.style.background = '#eff6ff'; }}
            onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)'; e.target.style.background = 'var(--bg-main)'; }}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

export { TEMPLATES };
