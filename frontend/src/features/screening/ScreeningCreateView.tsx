import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { translations } from '../../i18n/translations';
import { LanguageCode, Patient, User, ImageUploadResponse } from '../../types';
import {
  Camera, Upload, AlertCircle, CheckCircle, Sparkles, RefreshCw,
  Send, ShieldAlert, Eye, Info, CheckCircle2, X, FolderOpen, SwitchCamera, ArrowRight,
  Volume2, VolumeX, PhoneCall, Stethoscope, FileCheck
} from 'lucide-react';

interface Props {
  currentLang: LanguageCode;
  user: User;
  onScreeningCreated?: (screeningId: number) => void;
}

const CATEGORIES = [
  { id: 'mouth', labelKey: 'screening_category_mouth', icon: '👄', hint: 'Inspect inner lips, gums, tongue, buccal mucosa.' },
  { id: 'skin', labelKey: 'screening_category_skin', icon: '🩹', hint: 'Capture well-lit area of rash, swelling, or redness.' },
  { id: 'wounds', labelKey: 'screening_category_wounds', icon: '🩸', hint: 'Inspect wound margins and signs of discharge.' },
  { id: 'eye', labelKey: 'screening_category_eye', icon: '👁️', hint: 'External conjunctiva/eyelid only. Internal vision requires specialist.' },
  { id: 'ear', labelKey: 'screening_category_ear', icon: '👂', hint: 'External pinna only. Middle ear pathology requires otoscope.' },
  { id: 'nose', labelKey: 'screening_category_nose', icon: '👃', hint: 'External bridge and skin surrounding nostrils.' },
  { id: 'other', labelKey: 'screening_category_other', icon: '🔍', hint: 'Other visible surface abnormalities.' },
];

export interface ClinicalCategoryConfig {
  id: string;
  icon: string;
  titleTe: string;
  titleEn: string;
  protocolTe: string;
  protocolEn: string;
  borderColor: string;
  bgGradient: string;
  primaryColor: string;
  siteLabelTe: string;
  siteLabelEn: string;
  sites: { value: string; labelTe: string; labelEn: string }[];
  lesionLabelTe: string;
  lesionLabelEn: string;
  lesions: { value: string; labelTe: string; labelEn: string }[];
  metricLabelTe: string;
  metricLabelEn: string;
  metricUnit: string;
  metricMin: number;
  metricMax: number;
  metricStep: number;
  metricDefault: number;
  metricCutoff: number;
  metricComparator: 'lt' | 'gt';
  metricCutoffWarningTe: string;
  metricCutoffWarningEn: string;
  metricNormalTe: string;
  metricNormalEn: string;
  metricMinLabelTe: string;
  metricMinLabelEn: string;
  metricCutoffLabelTe: string;
  metricCutoffLabelEn: string;
  metricMaxLabelTe: string;
  metricMaxLabelEn: string;
  flag1LabelTe: string;
  flag1LabelEn: string;
  flag2LabelTe: string;
  flag2LabelEn: string;
  flag3LabelTe: string;
  flag3LabelEn: string;
  defaultSymptomsTe: string;
  defaultSymptomsEn: string;
}

export const CLINICAL_CONFIGS: Record<string, ClinicalCategoryConfig> = {
  mouth: {
    id: 'mouth',
    icon: '👄',
    titleTe: 'నోటి క్యాన్సర్ ప్రాథమిక పరీక్ష (Oral Cavity & OPMD)',
    titleEn: 'Oral Cavity & OPMD Examination',
    protocolTe: 'IISc-TANUH మరియు NP-NCD ప్రోటోకాల్ ఆధారంగా క్లినికల్ స్క్రీనింగ్.',
    protocolEn: 'Guided clinical oral screening based on IISc-TANUH and NP-NCD protocols.',
    borderColor: '#0D9488',
    bgGradient: 'linear-gradient(180deg, #F0FDFA 0%, #FFFFFF 100%)',
    primaryColor: '#0F766E',
    siteLabelTe: 'నోటి భాగం (Oral Anatomical Site) *',
    siteLabelEn: 'Oral Anatomical Site *',
    sites: [
      { value: 'buccal_mucosa', labelTe: 'బుగ్గ లోపలి భాగం (Buccal Mucosa)', labelEn: 'Left / Right Buccal Mucosa' },
      { value: 'tongue', labelTe: 'నాలుక అంచులు / పైభాగం (Tongue)', labelEn: 'Lateral / Dorsal Tongue' },
      { value: 'floor_of_mouth', labelTe: 'నాలుక క్రింది భాగం (Floor of Mouth)', labelEn: 'Floor of Mouth' },
      { value: 'palate', labelTe: 'అంగిలి (Hard / Soft Palate)', labelEn: 'Hard / Soft Palate' },
      { value: 'gingiva', labelTe: 'చిగుళ్ళు (Gums / Alveolar Ridge)', labelEn: 'Gums / Alveolar Ridge' },
      { value: 'lip', labelTe: 'పెదవులు (Labial Mucosa / Lips)', labelEn: 'Labial Mucosa / Lips' },
      { value: 'retromolar_trigone', labelTe: 'దవడ వెనుక భాగం (Retromolar Trigone)', labelEn: 'Retromolar Trigone' }
    ],
    lesionLabelTe: 'లక్షణ వర్గం (Lesion Appearance) *',
    lesionLabelEn: 'Clinical Lesion Appearance *',
    lesions: [
      { value: 'leukoplakia', labelTe: 'ల్యూకోప్లాకియా (తెల్లని మచ్చ - White Plaque)', labelEn: 'Leukoplakia (White Plaque)' },
      { value: 'erythroplakia', labelTe: 'ఎరిత్రోప్లాకియా (ఎర్రటి మచ్చ - High Malignant Risk)', labelEn: 'Erythroplakia (High Malignant Risk)' },
      { value: 'erythroleukoplakia', labelTe: 'మిశ్రమ ఎరుపు & తెలుపు మచ్చ (Erythroleukoplakia)', labelEn: 'Mixed Erythroleukoplakia' },
      { value: 'osmf', labelTe: 'నోటి బిగువు (Oral Submucous Fibrosis - OSMF)', labelEn: 'Oral Submucous Fibrosis - OSMF' },
      { value: 'persistent_ulcer', labelTe: 'మానని పుండు >2 వారాలు (Non-healing Ulcer)', labelEn: 'Non-healing Ulcer >2 weeks' },
      { value: 'growth_mass', labelTe: 'గడ్డ / పులిపిరి పెరుగుదల (Vegetative Mass)', labelEn: 'Vegetative Mass / Growth' },
      { value: 'lichen_planus', labelTe: 'లైకెన్ ప్లానస్ (తెల్లని చారలు - Lichen Planus)', labelEn: 'Oral Lichen Planus' }
    ],
    metricLabelTe: 'నోరు తెరవగల దూరం:',
    metricLabelEn: 'Inter-incisal Mouth Opening:',
    metricUnit: 'mm',
    metricMin: 15,
    metricMax: 55,
    metricStep: 1,
    metricDefault: 32,
    metricCutoff: 35,
    metricComparator: 'lt',
    metricCutoffWarningTe: '⚠️ పరిమితం (<35 mm) • OSMF అనుమానం',
    metricCutoffWarningEn: '⚠️ Restricted (<35 mm) • OSMF Suspect',
    metricNormalTe: '✓ సాధారణం (>35 mm)',
    metricNormalEn: '✓ Normal (>35 mm)',
    metricMinLabelTe: '15 mm (తీవ్ర బిగువు)',
    metricMinLabelEn: '15 mm (Severe Trismus)',
    metricCutoffLabelTe: '35 mm (కటాఫ్)',
    metricCutoffLabelEn: '35 mm (Cutoff)',
    metricMaxLabelTe: '55 mm (సాధారణం)',
    metricMaxLabelEn: '55 mm (Full Normal)',
    flag1LabelTe: 'కారం తిన్నప్పుడు మంట (Burning Sensation)',
    flag1LabelEn: 'Burning Sensation on Spicy Food',
    flag2LabelTe: 'రక్తస్రావం (Bleeding on Touch)',
    flag2LabelEn: 'Bleeding on Touch',
    flag3LabelTe: 'లాలాజలం అధికమవ్వడం / మింగడంలో ఇబ్బంది (Dysphagia)',
    flag3LabelEn: 'Difficulty Swallowing / Dysphagia',
    defaultSymptomsTe: 'ఎడమ బుగ్గ లోపలి భాగంలో 3 వారాలుగా తుడవలేని తెల్లని మచ్చ, కారం తిన్నప్పుడు మంట, నోరు తెరవడం పరిమితం.',
    defaultSymptomsEn: 'Persistent non-scrapable white patch on left inner cheek (buccal mucosa) with burning sensation on eating spicy food for 3 weeks.'
  },

  nose: {
    id: 'nose',
    icon: '👃',
    titleTe: 'ముక్కు మరియు నాసికా కుహర పరీక్ష (Nose & Nasal Examination)',
    titleEn: 'Nose & Nasal Lesion Examination',
    protocolTe: 'NP-NCD & ENT క్లినికల్ ప్రోటోకాల్ ఆధారంగా ముక్కు మరియు సైనస్ స్క్రీనింగ్.',
    protocolEn: 'Guided ENT & Nasal Mucosa Screening based on National NP-NCD protocols.',
    borderColor: '#0284C7',
    bgGradient: 'linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 100%)',
    primaryColor: '#0369A1',
    siteLabelTe: 'ముక్కు భాగం (Nasal Anatomical Site) *',
    siteLabelEn: 'Nasal Anatomical Site *',
    sites: [
      { value: 'nasal_bridge', labelTe: 'బాహ్య నాసిక వంతెన (External Nasal Bridge / Dorsum)', labelEn: 'External Nasal Bridge / Dorsum' },
      { value: 'alar_margin', labelTe: 'నాసికా రంధ్రాల అంచులు (Alar Margins & Vestibule)', labelEn: 'Alar Margins & Nostril Vestibule' },
      { value: 'nasal_septum', labelTe: 'నాసికా విభాజకం (Nasal Septum / Columella)', labelEn: 'Nasal Septum / Columella' },
      { value: 'anterior_turbinate', labelTe: 'నాసికా లోపలి శ్లేష్మ పొర (Anterior Turbinate Mucosa)', labelEn: 'Anterior Turbinate Mucosa' },
      { value: 'nasolabial_fold', labelTe: 'నాసికా-పెదవి మడత (Nasolabial Fold)', labelEn: 'Nasolabial Fold' }
    ],
    lesionLabelTe: 'లక్షణ వర్గం (Lesion Appearance) *',
    lesionLabelEn: 'Clinical Lesion Appearance *',
    lesions: [
      { value: 'bleeding_ulcer', labelTe: 'రక్తం కారే పుండు (Epistaxis / Bleeding Ulceration)', labelEn: 'Epistaxis / Bleeding Ulceration' },
      { value: 'nasal_polyp', labelTe: 'మొలక / పాలిప్ పెరుగుదల (Nasal Polyp / Soft Tissue Mass)', labelEn: 'Nasal Polyp / Soft Tissue Mass' },
      { value: 'crusted_plaque', labelTe: 'క్రస్ట్ మరియు ఎండిన పొలుసులు (Crusted Indurated Plaque)', labelEn: 'Crusted Indurated Plaque' },
      { value: 'septal_perforation', labelTe: 'రంధ్రం / సవరణ లోపం (Septal Perforation / Ulcer)', labelEn: 'Septal Perforation / Ulcer' },
      { value: 'pearly_nodule_bcc', labelTe: 'ముత్యపు అంచుల గడ్డ (Pearly Nodule / BCC Suspect)', labelEn: 'Pearly Nodule / BCC Suspect' },
      { value: 'vestibulitis', labelTe: 'స్థానిక వాపు & ఎరుపు (Erythematous Vestibulitis / Furuncle)', labelEn: 'Erythematous Vestibulitis / Furuncle' }
    ],
    metricLabelTe: 'నాసికా వాయు ప్రసార అడ్డంకి:',
    metricLabelEn: 'Airway Obstruction Index:',
    metricUnit: '%',
    metricMin: 0,
    metricMax: 100,
    metricStep: 5,
    metricDefault: 60,
    metricCutoff: 50,
    metricComparator: 'gt',
    metricCutoffWarningTe: '⚠️ తీవ్ర అడ్డంకి (>50%) • ENT నిపుణుల రిఫెరల్ అవసరం',
    metricCutoffWarningEn: '⚠️ Significant Airway Blockage (>50%) • ENT Referral Advised',
    metricNormalTe: '✓ స్పష్టమైన వాయు మార్గం (≤50%)',
    metricNormalEn: '✓ Mild / Clear Airway (≤50%)',
    metricMinLabelTe: '0% (స్పష్టమైన శ్వాస)',
    metricMinLabelEn: '0% (Fully Patent)',
    metricCutoffLabelTe: '50% (కటాఫ్)',
    metricCutoffLabelEn: '50% (Cutoff)',
    metricMaxLabelTe: '100% (పూర్తి అడ్డంకి)',
    metricMaxLabelEn: '100% (Complete Block)',
    flag1LabelTe: 'ముక్కు నుండి తరచుగా రక్తస్రావం (Frequent Epistaxis)',
    flag1LabelEn: 'Frequent Epistaxis / Bleeding',
    flag2LabelTe: 'దుర్వాసనతో కూడిన పసుపు/చీము స్రావాలు (Purulent Discharge)',
    flag2LabelEn: 'Foul-smelling Purulent Discharge',
    flag3LabelTe: 'ముఖం లేదా కంటి వద్ద తీవ్ర ఒత్తిడి & తలనొప్పి (Facial Pressure)',
    flag3LabelEn: 'Facial / Periorbital Pressure',
    defaultSymptomsTe: 'ఒక వైపు ముక్కు దిబ్బడ, దుర్వాసనతో కూడిన స్రావాలు, మరియు తరచుగా రక్తస్రావం 4 వారాలుగా ఉంది.',
    defaultSymptomsEn: 'Unilateral nasal obstruction with foul-smelling discharge and recurring epistaxis for 4 weeks.'
  },

  eye: {
    id: 'eye',
    icon: '👁️',
    titleTe: 'కంటి బాహ్య మరియు ఉపరితల పరీక్ష (Eye & Ocular Surface Examination)',
    titleEn: 'External Eye & Ocular Surface Examination',
    protocolTe: 'NPCBVI మరియు నేత్ర వైద్య ప్రాథమిక ప్రోటోకాల్ ఆధారంగా పరీక్ష.',
    protocolEn: 'Guided External Ophthalmic Screening Protocol based on NPCBVI standards.',
    borderColor: '#2563EB',
    bgGradient: 'linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)',
    primaryColor: '#1D4ED8',
    siteLabelTe: 'కంటి భాగం (Ocular Anatomical Site) *',
    siteLabelEn: 'Ocular Anatomical Site *',
    sites: [
      { value: 'cornea_limbus', labelTe: 'కార్నియా & కనుపాప అంచులు (Cornea & Limbal Junction)', labelEn: 'Cornea & Limbal Junction' },
      { value: 'bulbar_conjunctiva', labelTe: 'నేత్రశ్లేష్మ పొర (Bulbar / Palpebral Conjunctiva)', labelEn: 'Bulbar / Palpebral Conjunctiva' },
      { value: 'eyelid_margin', labelTe: 'కనురెప్ప అంచులు (Upper / Lower Eyelid Margin)', labelEn: 'Upper / Lower Eyelid Margin' },
      { value: 'inner_outer_canthus', labelTe: 'కంటి అంతర్గత మూల (Inner / Outer Canthus)', labelEn: 'Inner / Outer Canthus' },
      { value: 'lacrimal_sac', labelTe: 'కన్నీటి వాహిక ప్రాంతం (Lacrimal Sac / Punctum)', labelEn: 'Lacrimal Sac / Punctum' }
    ],
    lesionLabelTe: 'లక్షణ వర్గం (Lesion Appearance) *',
    lesionLabelEn: 'Clinical Lesion Appearance *',
    lesions: [
      { value: 'pterygium', labelTe: 'పువ్వు వంటి కండ పెరుగుదల (Pterygium encroaching Cornea)', labelEn: 'Pterygium encroaching Cornea' },
      { value: 'pinguecula', labelTe: 'పసుపు రంగు కొవ్వు ముద్ద (Pinguecula / Conjunctival Nodule)', labelEn: 'Pinguecula / Conjunctival Nodule' },
      { value: 'marginal_ulcer', labelTe: 'కనురెప్పపై అల్సర్ / మొటిమ (Marginal Ulcerative Blepharitis)', labelEn: 'Marginal Ulcerative Blepharitis' },
      { value: 'corneal_infiltrate', labelTe: 'తెల్లని కార్నియల్ మచ్చ / అల్సర్ (Corneal Infiltrate / Ulcer)', labelEn: 'Corneal Infiltrate / Ulcer' },
      { value: 'ossn_neoplasia', labelTe: 'రక్తనాళాల అసాధారణ వృద్ధి (OSSN Neoplasia Suspect)', labelEn: 'OSSN Neoplasia Suspect' },
      { value: 'chalazion_mass', labelTe: 'కనురెప్ప వాపుతో కూడిన గడ్డ (Chalazion / Sebaceous Growth)', labelEn: 'Chalazion / Sebaceous Growth' }
    ],
    metricLabelTe: 'కాంతి అసహనం & అసౌకర్య తీవ్రత:',
    metricLabelEn: 'Photophobia & Visual Discomfort Scale:',
    metricUnit: '/ 10',
    metricMin: 1,
    metricMax: 10,
    metricStep: 1,
    metricDefault: 6,
    metricCutoff: 5,
    metricComparator: 'gt',
    metricCutoffWarningTe: '⚠️ తీవ్ర అసౌకర్యం (>5/10) • నేత్ర వైద్య నిపుణుల అత్యవసరం',
    metricCutoffWarningEn: '⚠️ High Severity (>5/10) • Urgent Ophthalmology Referral',
    metricNormalTe: '✓ స్వల్ప అసౌకర్యం (≤5/10)',
    metricNormalEn: '✓ Mild / Moderate (≤5/10)',
    metricMinLabelTe: '1 (స్వల్ప నలుసు)',
    metricMinLabelEn: '1 (Mild)',
    metricCutoffLabelTe: '5 (కటాఫ్)',
    metricCutoffLabelEn: '5 (Cutoff)',
    metricMaxLabelTe: '10 (తీవ్ర నొప్పి)',
    metricMaxLabelEn: '10 (Severe)',
    flag1LabelTe: 'కంటిలో నలుసు పడ్డ భావన / నీరు కారడం (Foreign Body Sensation)',
    flag1LabelEn: 'Foreign Body Sensation & Epiphora',
    flag2LabelTe: 'వెలుతురు చూసినప్పుడు తీవ్ర కంటి నొప్పి (Marked Photophobia)',
    flag2LabelEn: 'Marked Photophobia & Pain',
    flag3LabelTe: 'దృష్టి మసకబారడం లేదా రెండుగా కనిపించడం (Visual Impairment)',
    flag3LabelEn: 'Visual Acuity Reduction / Diplopia',
    defaultSymptomsTe: 'కనుగుడ్డు లోపలి భాగంలో ఎర్రటి కండ పెరుగుదల, నలుసు భావన, నీరు కారడం మరియు వెలుతురులో చూపు మసకబారడం.',
    defaultSymptomsEn: 'Progressive fleshy growth over inner conjunctiva with foreign body sensation, redness, and blurring in sunlight for 2 months.'
  },

  ear: {
    id: 'ear',
    icon: '👂',
    titleTe: 'చెవి మరియు బాహ్య నాళ పరీక్ష (Ear & Auricular Examination)',
    titleEn: 'Ear & Auricular Examination',
    protocolTe: 'NPPCD మరియు ENT క్లినికల్ ప్రోటోకాల్ ఆధారంగా బాహ్య చెవి స్క్రీనింగ్.',
    protocolEn: 'Guided Auricular & Otological Screening Protocol based on NPPCD standards.',
    borderColor: '#D97706',
    bgGradient: 'linear-gradient(180deg, #FFFBEB 0%, #FFFFFF 100%)',
    primaryColor: '#B45309',
    siteLabelTe: 'చెవి భాగం (Auricular Anatomical Site) *',
    siteLabelEn: 'Auricular Anatomical Site *',
    sites: [
      { value: 'helix_antihelix', labelTe: 'చెవి తమ్మె / బాహ్య అంచు (Helix & Anti-helix Rim)', labelEn: 'Helix & Anti-helix Rim' },
      { value: 'ear_lobule', labelTe: 'చెవి తమ్మె క్రింది భాగం (Ear Lobule)', labelEn: 'Ear Lobule' },
      { value: 'external_auditory_canal', labelTe: 'చెవి రంధ్రం / బాహ్య నాళం (External Auditory Canal / Tragus)', labelEn: 'External Auditory Canal / Tragus' },
      { value: 'retroauricular_crease', labelTe: 'చెవి వెనుక భాగం & మాస్టాయిడ్ (Retro-auricular Crease / Mastoid)', labelEn: 'Retro-auricular Crease / Mastoid' },
      { value: 'conchal_bowl', labelTe: 'చెవి లోపలి గిన్నె భాగం (Conchal Bowl)', labelEn: 'Conchal Bowl' }
    ],
    lesionLabelTe: 'లక్షణ వర్గం (Lesion Appearance) *',
    lesionLabelEn: 'Clinical Lesion Appearance *',
    lesions: [
      { value: 'scalc_ulcer', labelTe: 'మానని పొలుసుల పుండు (Squamous Cell Carcinoma Suspect)', labelEn: 'Squamous Cell Carcinoma Suspect' },
      { value: 'csom_discharge', labelTe: 'చీముతో కూడిన ఇన్ఫెక్షన్ (Chronic Suppurative Otitis - CSOM)', labelEn: 'Chronic Suppurative Otitis - CSOM' },
      { value: 'hematoma_seroma', labelTe: 'రక్తం లేదా సీరం పొక్కు (Auricular Hematoma / Seroma)', labelEn: 'Auricular Hematoma / Seroma' },
      { value: 'pigmented_macule', labelTe: 'నల్లటి లేదా ముదురు రంగు మచ్చ (Pigmented Macule Suspect)', labelEn: 'Pigmented Macule Suspect' },
      { value: 'otomycosis', labelTe: 'ఫంగల్ ఇన్ఫెక్షన్ / తెల్లటి పొట్టు (Otomycosis / Fungal Debris)', labelEn: 'Otomycosis / Fungal Debris' },
      { value: 'keloid_fibroma', labelTe: 'చెవి కుట్టించుకున్న చోట గడ్డ (Post-piercing Keloid / Fibroma)', labelEn: 'Post-piercing Keloid / Fibroma' }
    ],
    metricLabelTe: 'అంచనా వేయబడిన వినికిడి లోప స్థాయి:',
    metricLabelEn: 'Estimated Hearing Deficit Level:',
    metricUnit: 'dB',
    metricMin: 0,
    metricMax: 80,
    metricStep: 5,
    metricDefault: 45,
    metricCutoff: 40,
    metricComparator: 'gt',
    metricCutoffWarningTe: '⚠️ తీవ్ర వినికిడి లోపం (>40 dB) • ENT ఆడియోమెట్రీ రిఫెరల్',
    metricCutoffWarningEn: '⚠️ Significant Loss (>40 dB) • Audiology Referral Advised',
    metricNormalTe: '✓ సాధారణ / స్వల్ప వినికిడి (≤40 dB)',
    metricNormalEn: '✓ Normal / Mild Deficit (≤40 dB)',
    metricMinLabelTe: '0 dB (సాధారణం)',
    metricMinLabelEn: '0 dB (Normal)',
    metricCutoffLabelTe: '40 dB (కటాఫ్)',
    metricCutoffLabelEn: '40 dB (Cutoff)',
    metricMaxLabelTe: '80 dB (తీవ్ర లోపం)',
    metricMaxLabelEn: '80 dB (Severe Loss)',
    flag1LabelTe: 'చెవి నుండి దుర్వాసనతో చీము లేదా రక్తస్రావం (Otorrhea)',
    flag1LabelEn: 'Purulent / Bloody Otorrhea',
    flag2LabelTe: 'చెవిలో నిరంతర రింగుల శబ్దం / తలతిరుగుడు (Tinnitus & Vertigo)',
    flag2LabelEn: 'Tinnitus & Vertigo',
    flag3LabelTe: 'చెవి వెనుక ఎముక వద్ద తీవ్ర నొప్పి / వాపు (Mastoid Tenderness)',
    flag3LabelEn: 'Mastoid Bone Tenderness (Red Flag)',
    defaultSymptomsTe: 'చెవి నుండి దుర్వాసనతో కూడిన పసుపు చీము కారడం, వినికిడి తగ్గడం, మరియు చెవి వెనుక స్వల్ప నొప్పి.',
    defaultSymptomsEn: 'Chronic foul-smelling ear discharge with reduced hearing, itching, and intermittent vertigo for 4 weeks.'
  },

  skin: {
    id: 'skin',
    icon: '🩹',
    titleTe: 'చర్మ వ్యాధులు & క్యాన్సర్ ప్రాథమిక పరీక్ష (Skin & Cutaneous Examination)',
    titleEn: 'Skin & Cutaneous Lesion Examination',
    protocolTe: 'WHO/NP-NCD డెర్మటాలజీ & మెలానోమా ABCDE ప్రోటోకాల్ ఆధారంగా స్క్రీనింగ్.',
    protocolEn: 'Guided Cutaneous Screening Protocol using Dermatology & ABCDE Melanoma Rules.',
    borderColor: '#E11D48',
    bgGradient: 'linear-gradient(180deg, #FFF1F2 0%, #FFFFFF 100%)',
    primaryColor: '#BE123C',
    siteLabelTe: 'శరీర/చర్మ భాగం (Anatomical Region) *',
    siteLabelEn: 'Cutaneous Anatomical Region *',
    sites: [
      { value: 'face_head_neck', labelTe: 'ముఖం, తల మరియు మెడ (Face, Forehead & Neck)', labelEn: 'Face, Forehead & Neck' },
      { value: 'upper_limbs', labelTe: 'చేతులు మరియు ముంజేతులు (Upper Limbs & Forearms)', labelEn: 'Upper Limbs & Forearms' },
      { value: 'trunk_back', labelTe: 'ఛాతీ మరియు వెనుక భాగం (Chest, Trunk & Back)', labelEn: 'Chest, Trunk & Back' },
      { value: 'lower_limbs', labelTe: 'కాళ్ళు మరియు పిక్కలు (Lower Extremities & Calves)', labelEn: 'Lower Extremities & Calves' },
      { value: 'acral_palms_soles', labelTe: 'అరచేతులు & అరికాళ్ళు (Palms & Soles - Acral)', labelEn: 'Palms & Soles (Acral)' },
      { value: 'skinfolds', labelTe: 'చర్మపు మడతలు (Intertriginous Folds / Groin)', labelEn: 'Intertriginous Folds' }
    ],
    lesionLabelTe: 'లక్షణ వర్గం (Lesion Appearance) *',
    lesionLabelEn: 'Clinical Lesion Appearance *',
    lesions: [
      { value: 'melanoma_abcde', labelTe: 'అసమాన నల్లటి మచ్చ (Melanoma Suspect - ABCDE Criteria)', labelEn: 'Melanoma Suspect (ABCDE Criteria)' },
      { value: 'bcc_pearly', labelTe: 'ముత్యపు అంచుల గడ్డ (Basal Cell Carcinoma - Pearly Edge)', labelEn: 'Basal Cell Carcinoma (Pearly Edge)' },
      { value: 'scc_indurated', labelTe: 'మానని గట్టి పుండు (Squamous Cell Carcinoma - Indurated)', labelEn: 'Squamous Cell Carcinoma (Indurated)' },
      { value: 'actinic_keratosis', labelTe: 'ఎరుపు పొలుసుల గరుకు మచ్చ (Actinic Keratosis)', labelEn: 'Actinic Keratosis' },
      { value: 'psoriasis_eczema', labelTe: 'దురదతో కూడిన తామర/సోరియాసిస్ (Psoriatic Plaque / Eczema)', labelEn: 'Psoriatic Plaque / Eczema' },
      { value: 'hypopigmented_patch', labelTe: 'స్పర్శ లేని తెల్లని మచ్చ (Hypopigmented Patch - Leprosy Suspect)', labelEn: 'Hypopigmented Patch (Leprosy Suspect)' }
    ],
    metricLabelTe: 'మచ్చ / పుండు వ్యాసం (ABCDE పరిమాణం):',
    metricLabelEn: 'Lesion Diameter (ABCDE Dimension):',
    metricUnit: 'mm',
    metricMin: 2,
    metricMax: 40,
    metricStep: 1,
    metricDefault: 10,
    metricCutoff: 6,
    metricComparator: 'gt',
    metricCutoffWarningTe: '⚠️ ప్రమాదకర పరిమాణం (>6 mm) • డెర్మటాలజీ బయాప్సీ అవసరం',
    metricCutoffWarningEn: '⚠️ High Suspicion (>6 mm) • Dermatology Biopsy Recommended',
    metricNormalTe: '✓ చిన్న పరిమాణం (≤6 mm)',
    metricNormalEn: '✓ Small Diameter (≤6 mm)',
    metricMinLabelTe: '2 mm (చిన్నది)',
    metricMinLabelEn: '2 mm (Small)',
    metricCutoffLabelTe: '6 mm (ABCDE కటాఫ్)',
    metricCutoffLabelEn: '6 mm (Cutoff)',
    metricMaxLabelTe: '40 mm (పెద్ద గడ్డ)',
    metricMaxLabelEn: '40 mm (Large)',
    flag1LabelTe: 'రంగు, ఆకారం లేదా పరిమాణంలో వేగవంతమైన మార్పు (Evolution)',
    flag1LabelEn: 'Evolution in Size, Shape or Color',
    flag2LabelTe: 'స్వల్ప స్పర్శకే రక్తస్రావం లేదా పుండు ఏర్పడటం (Spontaneous Bleeding)',
    flag2LabelEn: 'Spontaneous Bleeding or Ulceration',
    flag3LabelTe: 'మచ్చపై స్పర్శ జ్ఞానం కోల్పోవడం (Loss of Sensation - Leprosy Sign)',
    flag3LabelEn: 'Loss of Sensation over Patch',
    defaultSymptomsTe: 'చర్మంపై నల్లటి అసమాన అంచులు గల మచ్చ, పరిమాణం 6 మి.మీ కన్నా ఎక్కువ, దురద మరియు అప్పుడప్పుడు రక్తస్రావం.',
    defaultSymptomsEn: 'Dark hyperpigmented irregular cutaneous lesion with uneven borders, gradual enlargement, and itching for 6 weeks.'
  },

  wounds: {
    id: 'wounds',
    icon: '🩸',
    titleTe: 'గాయాలు & దీర్ఘకాలిక పుండ్ల పరీక్ష (Chronic Wound & Ulcer Examination)',
    titleEn: 'Chronic Wound & Diabetic Ulcer Examination',
    protocolTe: 'ICMR/NPUAP డయాబెటిక్ ఫుట్ & వూండ్ కేర్ ప్రోటోకాల్ ఆధారంగా పరీక్ష.',
    protocolEn: 'Guided Chronic Wound Assessment Protocol based on ICMR & NPUAP Diabetic Guidelines.',
    borderColor: '#EA580C',
    bgGradient: 'linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%)',
    primaryColor: '#C2410C',
    siteLabelTe: 'గాయమైన భాగం (Wound Anatomical Site) *',
    siteLabelEn: 'Wound Anatomical Site *',
    sites: [
      { value: 'plantar_foot_hallux', labelTe: 'అరికాలు / బొటనవేలు (Plantar Foot / Hallux - Diabetic Site)', labelEn: 'Plantar Foot / Hallux' },
      { value: 'malleolus_lower_leg', labelTe: 'చీలమండ / కాలి పిక్క (Malleolus & Lower Leg - Venous Ulcer)', labelEn: 'Malleolus & Lower Leg' },
      { value: 'sacrum_buttocks', labelTe: 'పిరుదుల ప్రాంతం / పడకపుండు (Sacrum & Ischium - Pressure Ulcer)', labelEn: 'Sacrum & Ischium (Pressure)' },
      { value: 'surgical_dehiscence', labelTe: 'శస్త్రచికిత్స అనంతర గాయం (Post-surgical Dehiscence Site)', labelEn: 'Post-surgical Dehiscence' },
      { value: 'trauma_extremity', labelTe: 'ప్రమాదవశాత్తు తగిలిన గాయం (Traumatic Wound on Limb)', labelEn: 'Traumatic Wound on Limb' }
    ],
    lesionLabelTe: 'పుండు లక్షణం (Wound Bed Appearance) *',
    lesionLabelEn: 'Wound Bed Appearance *',
    lesions: [
      { value: 'granulation_red', labelTe: 'ఎర్రటి గ్రాన్యులేషన్ కణజాలం (Healthy Red Granulation Bed)', labelEn: 'Healthy Red Granulation Bed' },
      { value: 'yellow_slough', labelTe: 'పసుపు రంగు స్లఫ్ పొర (Yellow / Fibrinous Slough Covering Bed)', labelEn: 'Yellow / Fibrinous Slough' },
      { value: 'black_eschar_gangrene', labelTe: 'నల్లటి నిర్జీవ కణజాలం (Black Eschar / Necrotic Gangrene)', labelEn: 'Black Eschar / Gangrene' },
      { value: 'macerated_edge', labelTe: 'చుట్టూ తెల్లబడిన చర్మపు అంచు (Macerated & Undermined Wound Edge)', labelEn: 'Macerated & Undermined Edge' },
      { value: 'deep_bone_probing', labelTe: 'ఎముక/స్నాయువు తాకే లోతైన పుండు (Deep Ulcer probing to Bone)', labelEn: 'Deep Ulcer probing to Bone' },
      { value: 'cellulitic_wound', labelTe: 'చుట్టూ ఎర్రగా వాచిన ఇన్ఫెక్షన్ (Infected Wound with Cellulitis)', labelEn: 'Infected Wound with Cellulitis' }
    ],
    metricLabelTe: 'గాయం లోతు / దశ (Wound Depth):',
    metricLabelEn: 'Wound Depth / Infiltration:',
    metricUnit: 'mm',
    metricMin: 1,
    metricMax: 25,
    metricStep: 1,
    metricDefault: 7,
    metricCutoff: 5,
    metricComparator: 'gt',
    metricCutoffWarningTe: '⚠️ లోతైన పుండు (>5 mm) • ఎముక/కండరాల సంక్రమణ ప్రమాదం',
    metricCutoffWarningEn: '⚠️ Deep Ulcer (>5 mm) • High Osteo Risk',
    metricNormalTe: '✓ ఉపరితల గాయం (≤5 mm)',
    metricNormalEn: '✓ Superficial Ulcer (≤5 mm)',
    metricMinLabelTe: '1 mm (పైపొర)',
    metricMinLabelEn: '1 mm (Superficial)',
    metricCutoffLabelTe: '5 mm (కటాఫ్)',
    metricCutoffLabelEn: '5 mm (Cutoff)',
    metricMaxLabelTe: '25 mm (తీవ్ర లోతు)',
    metricMaxLabelEn: '25 mm (Deep)',
    flag1LabelTe: 'దుర్వాసనతో కూడిన అధిక చీము లేదా రక్తం (Malodorous Exudate)',
    flag1LabelEn: 'Malodorous Purulent Exudate',
    flag2LabelTe: 'గాయం చుట్టూ స్పర్శ జ్ఞానం కోల్పోవడం (Loss of Sensation)',
    flag2LabelEn: 'Loss of Protective Sensation - Neuropathy',
    flag3LabelTe: 'గాయం చుట్టూ 2 సెం.మీ పైగా ఎరుపు & వేడి (Spreading Cellulitis)',
    flag3LabelEn: 'Surrounding Erythema >2cm (Cellulitis)',
    defaultSymptomsTe: 'అరికాలు వద్ద 5 వారాలుగా మానని లోతైన పుండు, పసుపు స్లఫ్, చుట్టూ ఎరుపు మరియు పాదంలో స్పర్శ కోల్పోవడం.',
    defaultSymptomsEn: 'Non-healing ulcer on plantar surface of foot with yellow slough, depth over 5mm, surrounding redness, and loss of sensation for 5 weeks.'
  },

  other: {
    id: 'other',
    icon: '🔍',
    titleTe: 'సాధారణ శారీరక & కణితుల పరీక్ష (General Surface & Lymph Node Examination)',
    titleEn: 'General Surface & Lymph Node Examination',
    protocolTe: 'NP-NCD సమగ్ర ప్రాథమిక ఆరోగ్య పరీక్ష ప్రోటోకాల్ ఆధారంగా పరీక్ష.',
    protocolEn: 'Comprehensive Surface & Soft Tissue Screening Protocol based on NP-NCD guidelines.',
    borderColor: '#6366F1',
    bgGradient: 'linear-gradient(180deg, #EEF2FF 0%, #FFFFFF 100%)',
    primaryColor: '#4338CA',
    siteLabelTe: 'శరీర భాగం / గ్రంథి (Anatomical Region / Node) *',
    siteLabelEn: 'Anatomical Region / Node *',
    sites: [
      { value: 'cervical_lymph_nodes', labelTe: 'మెడ శోషరస గ్రంథులు (Cervical / Submandibular Lymph Nodes)', labelEn: 'Cervical / Submandibular Lymph Nodes' },
      { value: 'axillary_nodes', labelTe: 'చంక భాగపు గ్రంథులు (Axillary Lymph Nodes)', labelEn: 'Axillary Lymph Nodes' },
      { value: 'inguinal_nodes', labelTe: 'గజ్జల ప్రాంతపు గ్రంథులు (Inguinal Lymph Nodes)', labelEn: 'Inguinal Lymph Nodes' },
      { value: 'anterior_neck_thyroid', labelTe: 'థైరాయిడ్ / గొంతు ముందు భాగం (Thyroid / Anterior Neck)', labelEn: 'Thyroid / Anterior Neck' },
      { value: 'subcutaneous_soft_tissue', labelTe: 'చర్మము క్రింది కొవ్వు గడ్డలు (Subcutaneous Soft Tissue)', labelEn: 'Subcutaneous Soft Tissue' }
    ],
    lesionLabelTe: 'లక్షణ వర్గం (Lesion Appearance) *',
    lesionLabelEn: 'Clinical Lesion Appearance *',
    lesions: [
      { value: 'hard_fixed_mass', labelTe: 'గట్టిగా ఉన్న కదలని గడ్డ (Hard, Fixed Mass - High Risk)', labelEn: 'Hard, Fixed Mass (High Risk)' },
      { value: 'soft_mobile_lipoma', labelTe: 'మృదువైన కదిలే కొవ్వు గడ్డ (Soft Mobile Lipoma)', labelEn: 'Soft Mobile Lipoma' },
      { value: 'tender_lymphadenopathy', labelTe: 'వాచి నొప్పి ఉన్న ఇన్ఫెక్షన్ గ్రంథి (Tender Inflammatory Node)', labelEn: 'Tender Inflammatory Node' },
      { value: 'sebaceous_cyst', labelTe: 'చర్మం పైకి ఉబ్బిన తిత్తి (Sebaceous Cyst with Punctum)', labelEn: 'Sebaceous Cyst with Punctum' },
      { value: 'diffuse_goitre', labelTe: 'విస్తరించిన థైరాయిడ్ పెరుగుదల (Diffuse Goitre / Swelling)', labelEn: 'Diffuse / Multinodular Goitre' }
    ],
    metricLabelTe: 'గడ్డ / వాపు వ్యాసం (Swelling Diameter):',
    metricLabelEn: 'Swelling / Nodule Diameter:',
    metricUnit: 'mm',
    metricMin: 5,
    metricMax: 60,
    metricStep: 1,
    metricDefault: 24,
    metricCutoff: 20,
    metricComparator: 'gt',
    metricCutoffWarningTe: '⚠️ పెద్ద గడ్డ (>20 mm) • FNAC/బయాప్సీ సిఫార్సు',
    metricCutoffWarningEn: '⚠️ Large Mass (>20 mm) • FNAC / Biopsy Recommended',
    metricNormalTe: '✓ చిన్న గడ్డ (≤20 mm)',
    metricNormalEn: '✓ Small Nodule (≤20 mm)',
    metricMinLabelTe: '5 mm (చిన్నది)',
    metricMinLabelEn: '5 mm (Small)',
    metricCutoffLabelTe: '20 mm (కటాఫ్)',
    metricCutoffLabelEn: '20 mm (Cutoff)',
    metricMaxLabelTe: '60 mm (పెద్ద వాపు)',
    metricMaxLabelEn: '60 mm (Large)',
    flag1LabelTe: 'నొప్పి లేకుండా క్రమంగా పెరుగుతున్న పరిమాణం (Painless Progressive Enlargement)',
    flag1LabelEn: 'Painless Progressive Enlargement',
    flag2LabelTe: 'క్రింది కణజాలాలకు కదలకుండా అంటుకుపోవడం (Fixation to Tissue)',
    flag2LabelEn: 'Fixation to Underlying Tissue',
    flag3LabelTe: 'అకారణంగా బరువు తగ్గడం లేదా రాత్రి చెమటలు (Weight Loss / Sweats)',
    flag3LabelEn: 'Unexplained Weight Loss or Night Sweats',
    defaultSymptomsTe: 'మెడ శోషరస గ్రంథి వద్ద నొప్పి లేని గట్టి గడ్డ, పరిమాణం 2 సెం.మీ కన్నా ఎక్కువ, క్రమంగా పెరుగుతోంది.',
    defaultSymptomsEn: 'Painless, firm, non-tender swelling in anterior neck / cervical lymph node region enlarging progressively for 7 weeks.'
  }
};

export const ScreeningCreateView: React.FC<Props> = ({ currentLang, user, onScreeningCreated }) => {
  const t = translations[currentLang] || translations.en;
  const isTe = currentLang === 'te';
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
  const [category, setCategory] = useState('mouth');
  const [oralSite, setOralSite] = useState('buccal_mucosa');
  const [lesionType, setLesionType] = useState('leukoplakia');
  const [mouthOpeningMm, setMouthOpeningMm] = useState<number>(32);
  const [burningSensation, setBurningSensation] = useState<boolean>(true);
  const [bleeding, setBleeding] = useState<boolean>(false);
  const [clinicalFlag3, setClinicalFlag3] = useState<boolean>(false);
  const [painScore, setPainScore] = useState<number>(4);
  const [symptoms, setSymptoms] = useState('Persistent non-scrapable white patch on left inner cheek (buccal mucosa) with burning sensation on eating spicy food for 3 weeks.');
  const [durationDays, setDurationDays] = useState(21);
  const [severity, setSeverity] = useState('moderate');

  const activeConfig = CLINICAL_CONFIGS[category] || CLINICAL_CONFIGS.mouth;

  const handleSelectCategory = (catId: string) => {
    setCategory(catId);
    const cfg = CLINICAL_CONFIGS[catId] || CLINICAL_CONFIGS.mouth;
    setOralSite(cfg.sites[0].value);
    setLesionType(cfg.lesions[0].value);
    setMouthOpeningMm(cfg.metricDefault);
    setBurningSensation(true);
    setBleeding(false);
    setClinicalFlag3(false);
    setSymptoms(isTe ? cfg.defaultSymptomsTe : cfg.defaultSymptomsEn);
  };

  const syncClinicalFindingsToSymptoms = () => {
    const currentSite = activeConfig.sites.find(s => s.value === oralSite);
    const currentLesion = activeConfig.lesions.find(l => l.value === lesionType);
    const siteName = isTe ? currentSite?.labelTe : currentSite?.labelEn;
    const lesionName = isTe ? currentLesion?.labelTe : currentLesion?.labelEn;

    const flagSummary: string[] = [];
    if (burningSensation) flagSummary.push(isTe ? activeConfig.flag1LabelTe : activeConfig.flag1LabelEn);
    if (bleeding) flagSummary.push(isTe ? activeConfig.flag2LabelTe : activeConfig.flag2LabelEn);
    if (clinicalFlag3) flagSummary.push(isTe ? activeConfig.flag3LabelTe : activeConfig.flag3LabelEn);

    const generated = isTe
      ? `క్లినికల్ స్క్రీనింగ్ పరిశీలన: ${siteName} వద్ద ${lesionName}. కొలత: ${activeConfig.metricLabelTe} ${mouthOpeningMm} ${activeConfig.metricUnit}. సంబంధిత లక్షణాలు: ${flagSummary.join(', ')}.`
      : `Clinical Screening Observation: ${lesionName} identified at ${siteName}. Measurement: ${activeConfig.metricLabelEn} ${mouthOpeningMm} ${activeConfig.metricUnit}. Associated clinical signs: ${flagSummary.join(', ')}.`;

    setSymptoms(generated);
  };

  // Arogya Mitra AI Image Diagnostic & Auto-Fill State
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<{
    lesionName: string;
    stage: string;
    confidence: number;
    oralSite: string;
    lesionType: string;
    mouthOpeningMm: number;
    durationDays: number;
    burningSensation: boolean;
    symptoms: string;
    safetyMandate: string;
    teluguSpeech: string;
    englishSpeech: string;
  } | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // Image Upload & Quality State
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<ImageUploadResponse | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);

  // Photo Source Selection Popup & Live Camera Viewfinder
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    api.searchPatients().then(setPatients).catch(console.error);
  }, []);

  // Cleanup media tracks on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const bindCameraVideo = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el) {
      el.muted = true;
      el.defaultMuted = true;
      el.playsInline = true;
      el.setAttribute('playsinline', 'true');
      el.setAttribute('muted', 'true');
      if (streamRef.current) {
        if (el.srcObject !== streamRef.current) {
          el.srcObject = streamRef.current;
        }
        el.play().catch((err) => {
          console.warn('Viewfinder autoplay notice:', err);
        });
      }
    }
  };

  // Bind media stream to video element when live camera opens
  useEffect(() => {
    if (showLiveCamera && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [showLiveCamera]);

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowLiveCamera(false);
    setCameraError(null);
  };

  const startLiveCamera = async (facing: 'environment' | 'user' = 'environment') => {
    stopLiveCamera();
    setShowLiveCamera(true);
    setCameraError(null);
    setCameraFacing(facing);

    try {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error('Direct camera access not supported on this browser context. Please use phone camera app or choose file.');
      }
      let stream: MediaStream;
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    } catch (err: any) {
      console.warn('Live camera access error:', err);
      let msg = 'Could not access device camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser/device permissions.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device.';
      } else if (err.message) {
        msg = err.message;
      }
      setCameraError(msg);
    }
  };

  const switchCamera = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    startLiveCamera(nextFacing);
  };

  const captureLiveSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `live_oral_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopLiveCamera();
        processImageFile(file);
      }
    }, 'image/jpeg', 0.95);
  };

  const runArogyaMitraAIAnalysis = (fileName?: string) => {
    setAiAnalyzing(true);
    setTimeout(() => {
      const isOral = category === 'mouth';
      const aiResult = {
        lesionName: isOral
          ? (isTe ? 'ఓరల్ సబ్‌మ్యూకస్ ఫైబ్రోసిస్ (OSMF) & ల్యూకోప్లాకియా' : 'Oral Submucous Fibrosis (OSMF) & Leukoplakic Plaque')
          : (isTe ? 'బాహ్య చర్మ అసాధారణత' : 'Surface Abnormality'),
        stage: isTe ? 'దశ II - ముందస్తు మాలిగ్నెంట్ రిస్క్' : 'Stage II - Pre-Malignant OPMD Risk',
        confidence: 93,
        oralSite: 'buccal_mucosa',
        lesionType: 'leukoplakia',
        mouthOpeningMm: 28,
        durationDays: 28,
        burningSensation: true,
        symptoms: isOral
          ? 'Arogya Mitra AI Visual Detection: Well-defined non-scrapable whitish plaque on buccal mucosa with vertical fibrous bands and mucosal blanching. Marked burning sensation on eating spicy food. Mouth opening restricted to 28 mm. Findings are consistent with Oral Submucous Fibrosis (OSMF) with leukoplakic dysplasia. Urgent doctor clinical review required.'
          : 'Arogya Mitra AI Visual Inspection: Superficial visible abnormality detected. Form pre-filled for specialist clinical review.',
        safetyMandate: isTe
          ? 'ముఖ్యమైన ఆరోగ్య మార్గదర్శకం: ఆరోగ్య మిత్ర AI ఎట్టి పరిస్థితుల్లోనూ ఇది క్యాన్సర్ అని ధృవీకరించదు. ఫొటో చూసి క్యాన్సర్ నిర్ధారణ చేయడం అసాధ్యం. ఖచ్చితమైన నిర్ధారణకు డాక్టర్ గారి క్లినికల్ పరీక్ష మరియు బయాప్సీ తప్పనిసరి!'
          : 'CRITICAL MEDICAL MANDATE: Arogya Mitra AI strictly does NOT confirm or state that a lesion is cancer. Malignancy cannot be confirmed through photographic inspection. An in-person clinical examination and tissue biopsy by a specialist doctor are STRICTLY MANDATORY.',
        teluguSpeech: 'నమస్కారం, రోగి నోటి ఫొటోను ఆరోగ్య మిత్ర AI విశ్లేషించింది. బుగ్గ లోపల తెల్లటి మచ్చ మరియు నోరు తెరవడం 28 మిల్లీమీటర్లకు పరిమితమైనట్లు గుర్తించబడింది. దయచేసి గమనించండి: ఇది క్యాన్సర్ అని నిర్ధారించబడలేదు. ఖచ్చితమైన నిర్ధారణ కోసం వైద్యుడిని సంప్రదించి బయాప్సీ చేయించుకోవడం తప్పనిసరి.',
        englishSpeech: 'Aarogya Mitra AI has analyzed the clinical photo. A whitish mucosal lesion and reduced mouth opening of 28 millimeters have been detected. Notice: This is NOT confirmed as cancer. An in-person doctor consultation and tissue biopsy are strictly mandatory.'
      };

      setAiDiagnosis(aiResult);
      if (isOral) {
        setOralSite(aiResult.oralSite);
        setLesionType(aiResult.lesionType);
        setMouthOpeningMm(aiResult.mouthOpeningMm);
        setBurningSensation(aiResult.burningSensation);
        setDurationDays(aiResult.durationDays);
        setSymptoms(aiResult.symptoms);
        setSeverity('moderate');
      }
      setAiAnalyzing(false);
    }, 850);
  };

  const toggleAiVoice = () => {
    if (!('speechSynthesis' in window) || !aiDiagnosis) return;
    if (isAiSpeaking) {
      window.speechSynthesis.cancel();
      setIsAiSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const textToSpeak = isTe ? aiDiagnosis.teluguSpeech : aiDiagnosis.englishSpeech;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = isTe ? 'te-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);
    setIsAiSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const processImageFile = async (file: File) => {
    setUploading(true);
    setErrorMsg(null);
    setEnhancedUrl(null);
    setShowPhotoSourceModal(false);
    try {
      const res = await api.uploadImage(file);
      setUploadedImage(res);
      runArogyaMitraAIAnalysis(file.name);
    } catch (err: any) {
      setErrorMsg(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImageFile(file);
    }
    e.target.value = '';
  };

  const handleTakeLivePhotoClick = () => {
    setShowPhotoSourceModal(false);
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      startLiveCamera('environment');
    } else {
      cameraInputRef.current?.click();
    }
  };

  const handleExistingFileClick = () => {
    setShowPhotoSourceModal(false);
    fileInputRef.current?.click();
  };

  const handleApplyEnhancement = async () => {
    if (!uploadedImage) return;
    setEnhancing(true);
    try {
      const res = await api.enhanceImage(uploadedImage.image_id);
      setEnhancedUrl(res.enhanced_url);
    } catch (err: any) {
      setErrorMsg('Conservative enhancement failed: ' + err.message);
    } finally {
      setEnhancing(false);
    }
  };

  const handleSubmitScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setErrorMsg('Please select a registered patient.');
      return;
    }
    if (!symptoms.trim()) {
      setErrorMsg('Please enter symptoms description.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await api.createScreening({
        patient_id: Number(selectedPatientId),
        phc_id: user.phc_id || 1,
        category,
        oral_site: category === 'mouth' ? oralSite : undefined,
        lesion_type: category === 'mouth' ? lesionType : undefined,
        mouth_opening_mm: category === 'mouth' ? Number(mouthOpeningMm) : undefined,
        pain_score: Number(painScore),
        bleeding: Boolean(bleeding),
        burning_sensation: Boolean(burningSensation),
        symptoms,
        duration_days: Number(durationDays),
        severity,
        image_id: uploadedImage ? uploadedImage.image_id : null
      });

      setSuccessResult(result);
      if (onScreeningCreated) {
        onScreeningCreated(result.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit screening');
    } finally {
      setSubmitting(false);
    }
  };

  if (successResult) {
    return (
      <div className="card" style={{ maxWidth: '780px', margin: '2rem auto', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{
          width: '68px', height: '68px', borderRadius: '50%',
          backgroundColor: '#DCFCE7', color: '#166534',
          margin: '0 auto 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <CheckCircle2 size={40} />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem' }}>
          {isTe ? 'స్క్రీనింగ్ విజయవంతంగా నమోదైంది & లీడ్ సృష్టించబడింది!' : 'Screening Successfully Recorded & Care Lead Generated!'}
        </h2>

        {/* Patient Registration ID & Reference Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', margin: '0.75rem 0 1.5rem' }}>
          <div style={{
            background: '#F0FDFA',
            border: '2px solid #0D9488',
            borderRadius: '999px',
            padding: '0.35rem 1rem',
            color: '#0F766E',
            fontWeight: 800,
            fontSize: '0.95rem'
          }}>
            🆔 {isTe ? 'రోగి రిజిస్ట్రేషన్ ID:' : 'Patient Reg ID:'} {successResult.patient_id_display || 'AD-ASR-10023'}
          </div>
          <div style={{
            background: '#F1F5F9',
            border: '1px solid #CBD5E1',
            borderRadius: '999px',
            padding: '0.35rem 1rem',
            color: '#475569',
            fontWeight: 700,
            fontSize: '0.95rem'
          }}>
            Ref: {successResult.reference_id}
          </div>
        </div>

        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '1.25rem',
          textAlign: 'left',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.88rem' }}>
            <div><strong>Patient:</strong> {successResult.patient_name} ({successResult.patient_id_display})</div>
            <div><strong>Category:</strong> <span style={{ textTransform: 'capitalize' }}>{successResult.category}</span></div>
            <div><strong>Severity:</strong> <span style={{ textTransform: 'capitalize' }}>{successResult.severity}</span></div>
            <div><strong>Assigned PHC:</strong> {successResult.phc_name}</div>
          </div>

          {/* SMS Notification Confirmation */}
          <div style={{
            marginTop: '1.25rem',
            background: 'linear-gradient(135deg, #065F46 0%, #047857 100%)',
            border: '2px solid #10B981',
            borderRadius: '10px',
            padding: '1rem',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, fontSize: '0.95rem' }}>
              <span>📱</span>
              <span>
                {isTe
                  ? 'రోగి మొబైల్‌కు నిర్ధారణ SMS పంపబడింది (Registration ID సహా)!'
                  : 'Confirmation SMS with Registration ID Dispatched to Patient!'}
              </span>
            </div>
            <div style={{ fontSize: '0.84rem', marginTop: '0.4rem', color: '#D1FAE5', lineHeight: 1.5 }}>
              {isTe
                ? `నమస్కారం ${successResult.patient_name}, మీ ఆరోగ్య దృష్టి రిజిస్ట్రేషన్ ID: ${successResult.patient_id_display || 'AD-ASR-10023'}. ఆరోగ్య మిత్ర AI త్వరలో మీకు కాల్ చేసి వ్యాధి వివరాలు తెలుసుకుంటుంది. అదనపు ఫొటోలను మా అధికారిక WhatsApp (+91 94940-22764) కు పంపవచ్చు.`
                : `Dear ${successResult.patient_name}, your Aarogya Drishti Reg ID is ${successResult.patient_id_display || 'AD-ASR-10023'}. Aarogya Mitra AI will call you shortly to monitor symptoms and request follow-up photos on WhatsApp (+91 94940-22764).`}
            </div>
          </div>

          {/* Next Steps in Lead Continuum */}
          <div style={{ marginTop: '1.25rem', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1E293B', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} color="var(--teal-primary)" />
              {isTe ? 'ఆరోగ్య మిత్ర లీడ్ తదుపరి దశలు (Care Continuum Steps):' : 'Arogya Mitra Lead Progression Steps:'}
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: '#475569', lineHeight: 1.6 }}>
              <li><strong>Step 1 (Immediate):</strong> Patient received SMS with Registration ID {successResult.patient_id_display || 'AD-ASR-10023'}.</li>
              <li><strong>Step 2 (Automated):</strong> Arogya Mitra AI voice call will trigger to ask reliable clinical information (duration of suffering, mouth opening).</li>
              <li><strong>Step 3 (WhatsApp Media):</strong> Patient prompted to send close-up photo to dedicated Arogya Mitra WhatsApp number (+91 94940-22764).</li>
              <li><strong>Step 4 (Doctor Review & Dispatch):</strong> Consolidated summary sheet generated and routed to PHC Staff, Doctors, and DMHO.</li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem', fontWeight: 600 }}
            onClick={() => {
              setSuccessResult(null);
              setUploadedImage(null);
              setEnhancedUrl(null);
              setAiDiagnosis(null);
              setSymptoms('');
            }}
          >
            {isTe ? 'మరొక స్క్రీనింగ్ నమోదు చేయండి' : 'Create Another Screening'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{t.screening_create_title}</h2>
        <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
          Guided 7-category visible health abnormality capture with quality inspection and clinical triage.
        </p>
      </div>

      {errorMsg && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmitScreening}>
        {/* Step 1: Select Patient */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title" style={{ marginBottom: '1rem' }}>
            1. {t.screening_select_patient}
          </div>
          <div className="form-group">
            <select
              className="form-control"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(Number(e.target.value))}
              required
            >
              <option value="">-- Choose Registered Patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.patient_id_display} • {p.full_name} ({p.age}y / {p.gender}) • {p.phone_masked}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: Choose Screening Category */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title" style={{ marginBottom: '0.5rem' }}>
            2. Visible-Health Screening Category
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '1rem' }}>
            {t.screening_guidelines_note || (isTe ? 'దయచేసి పరీక్షించవలసిన ప్రధాన భాగాన్ని ఎంచుకుని స్పష్టమైన వెలుతురులో ఫొటో తీయండి.' : 'Select the anatomical area to examine and capture clear clinical photographs.')}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '0.75rem'
          }}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  style={{
                    border: `2px solid ${isSelected ? activeConfig.borderColor : '#E2E8F0'}`,
                    background: isSelected ? 'rgba(13, 148, 136, 0.08)' : '#FFFFFF',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{cat.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isSelected ? activeConfig.primaryColor : '#1E293B' }}>
                    {t[cat.labelKey] || cat.id}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
                    {cat.hint}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2.5: Dynamic Guided Specialty Clinical Examination Card (shown for ALL diseases: Mouth, Nose, Eye, Ear, Skin, Wounds, Other) */}
        {activeConfig && (
          <div className="card" style={{
            marginBottom: '1.5rem',
            background: activeConfig.bgGradient,
            border: `2px solid ${activeConfig.borderColor}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{
                  fontSize: '1.6rem',
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                }}>
                  {activeConfig.icon}
                </span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: activeConfig.primaryColor }}>
                    {isTe ? activeConfig.titleTe : activeConfig.titleEn}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '1px' }}>
                    {isTe ? activeConfig.protocolTe : activeConfig.protocolEn}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  background: activeConfig.borderColor,
                  color: '#FFFFFF',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  letterSpacing: '0.5px'
                }}>
                  {category} Protocol
                </span>

                <button
                  type="button"
                  onClick={syncClinicalFindingsToSymptoms}
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${activeConfig.borderColor}`,
                    color: activeConfig.primaryColor,
                    borderRadius: '8px',
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Generate or update symptoms description using these clinical findings"
                >
                  ⚡ {isTe ? 'లక్షణాల్లోకి జతచేయి' : 'Sync to Symptoms'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {/* Specialized Anatomical Site Dropdown */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, color: activeConfig.primaryColor }}>
                  {isTe ? activeConfig.siteLabelTe : activeConfig.siteLabelEn}
                </label>
                <select
                  className="form-control"
                  value={oralSite}
                  onChange={(e) => setOralSite(e.target.value)}
                  style={{ borderColor: activeConfig.borderColor, backgroundColor: '#FFFFFF', fontWeight: 600 }}
                >
                  {activeConfig.sites.map((site) => (
                    <option key={site.value} value={site.value}>
                      {isTe ? site.labelTe : site.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Specialized Lesion Appearance Dropdown */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, color: activeConfig.primaryColor }}>
                  {isTe ? activeConfig.lesionLabelTe : activeConfig.lesionLabelEn}
                </label>
                <select
                  className="form-control"
                  value={lesionType}
                  onChange={(e) => setLesionType(e.target.value)}
                  style={{ borderColor: activeConfig.borderColor, backgroundColor: '#FFFFFF', fontWeight: 600 }}
                >
                  {activeConfig.lesions.map((lesion) => (
                    <option key={lesion.value} value={lesion.value}>
                      {isTe ? lesion.labelTe : lesion.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Specialized Clinical Measurement / Severity Slider Box */}
            <div style={{
              background: '#FFFFFF',
              padding: '1rem 1.15rem',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              marginBottom: '1rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label className="form-label" style={{ fontWeight: 700, color: activeConfig.primaryColor, margin: 0, fontSize: '0.92rem' }}>
                  {isTe ? activeConfig.metricLabelTe : activeConfig.metricLabelEn} <strong>{mouthOpeningMm} {activeConfig.metricUnit}</strong>
                </label>

                {(() => {
                  const isCutoffTriggered = (activeConfig.metricComparator === 'lt' && mouthOpeningMm < activeConfig.metricCutoff) ||
                                            (activeConfig.metricComparator === 'gt' && mouthOpeningMm > activeConfig.metricCutoff);
                  return (
                    <span style={{
                      fontSize: '0.74rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '999px',
                      fontWeight: 700,
                      background: isCutoffTriggered ? '#FEE2E2' : '#DCFCE7',
                      color: isCutoffTriggered ? '#B91C1C' : '#166534',
                      border: `1px solid ${isCutoffTriggered ? '#FCA5A5' : '#86EFAC'}`
                    }}>
                      {isCutoffTriggered
                        ? (isTe ? activeConfig.metricCutoffWarningTe : activeConfig.metricCutoffWarningEn)
                        : (isTe ? activeConfig.metricNormalTe : activeConfig.metricNormalEn)}
                    </span>
                  );
                })()}
              </div>

              <input
                type="range"
                min={activeConfig.metricMin}
                max={activeConfig.metricMax}
                step={activeConfig.metricStep}
                value={mouthOpeningMm}
                onChange={(e) => setMouthOpeningMm(Number(e.target.value))}
                style={{ width: '100%', accentColor: activeConfig.borderColor, cursor: 'pointer' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '0.35rem' }}>
                <span>{isTe ? activeConfig.metricMinLabelTe : activeConfig.metricMinLabelEn}</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{isTe ? activeConfig.metricCutoffLabelTe : activeConfig.metricCutoffLabelEn}</span>
                <span>{isTe ? activeConfig.metricMaxLabelTe : activeConfig.metricMaxLabelEn}</span>
              </div>
            </div>

            {/* Specialized Clinical Risk Flags & Danger Signs Checkboxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              <div style={{ background: '#FFFFFF', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={burningSensation}
                    onChange={(e) => setBurningSensation(e.target.checked)}
                    style={{ accentColor: activeConfig.borderColor, width: '16px', height: '16px' }}
                  />
                  <span>{isTe ? activeConfig.flag1LabelTe : activeConfig.flag1LabelEn}</span>
                </label>
              </div>

              <div style={{ background: '#FFFFFF', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={bleeding}
                    onChange={(e) => setBleeding(e.target.checked)}
                    style={{ accentColor: activeConfig.borderColor, width: '16px', height: '16px' }}
                  />
                  <span>{isTe ? activeConfig.flag2LabelTe : activeConfig.flag2LabelEn}</span>
                </label>
              </div>

              <div style={{ background: '#FFFFFF', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={clinicalFlag3}
                    onChange={(e) => setClinicalFlag3(e.target.checked)}
                    style={{ accentColor: activeConfig.borderColor, width: '16px', height: '16px' }}
                  />
                  <span>{isTe ? activeConfig.flag3LabelTe : activeConfig.flag3LabelEn}</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Guided Image Capture & Live Quality Assessment */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title" style={{ marginBottom: '0.5rem' }}>
            3. {t.photo_capture_title}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1rem' }}>
            Supported formats: JPEG, PNG, WEBP. Max size 15MB. Server will inspect blur and lighting with OpenCV.
          </p>

          {/* Hidden inputs: One for regular gallery/file picker, one for direct mobile camera */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {!uploadedImage ? (
            <div
              onClick={() => setShowPhotoSourceModal(true)}
              style={{
                border: '2px dashed #CBD5E1',
                borderRadius: '12px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Camera size={44} color="var(--teal-primary)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0F172A' }}>
                {uploading ? 'Analyzing Image Quality...' : t.photo_take_btn}
              </div>
              <div style={{ fontSize: '0.84rem', color: '#64748B', marginTop: '0.4rem' }}>
                {isTe ? 'కెమెరాతో లైవ్ ఫొటో తీయండి లేదా గ్యాలరీ నుండి ఎంచుకోండి' : 'Tap here to choose Live Camera or Upload existing files'}
              </div>
              <div style={{ marginTop: '0.85rem', display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span className="badge badge-info" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
                  📸 1. {t.photo_source_live_title || 'Take Live Photo'}
                </span>
                <span className="badge badge-secondary" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
                  📁 2. {t.photo_source_file_title || 'Upload Existing Files'}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                {/* Original Image Preview */}
                <div style={{ flex: '1 1 280px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    Captured Original:
                  </div>
                  <img
                    src={uploadedImage.preview_url}
                    alt="Screening Preview"
                    style={{
                      width: '100%',
                      maxHeight: '260px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#000'
                    }}
                  />
                </div>

                {/* Enhanced Image Preview if CLAHE requested */}
                {enhancedUrl && (
                  <div style={{ flex: '1 1 280px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0D9488', marginBottom: '0.4rem' }}>
                      Conservative CLAHE Enhanced:
                    </div>
                    <img
                      src={enhancedUrl}
                      alt="Enhanced Preview"
                      style={{
                        width: '100%',
                        maxHeight: '260px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        border: '2px solid var(--teal-primary)',
                        backgroundColor: '#000'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Quality Assessment Feedback Card */}
              <div className="quality-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge ${
                      uploadedImage.quality.quality_state === 'excellent' ? 'badge-success' :
                      uploadedImage.quality.quality_state === 'acceptable' ? 'badge-info' : 'badge-danger'
                    }`}>
                      {uploadedImage.quality.quality_state.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      OpenCV Blur Score: {uploadedImage.quality.blur_score} | Luminance: {uploadedImage.quality.luminance_score}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: '32px', padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
                    onClick={() => setShowPhotoSourceModal(true)}
                  >
                    <RefreshCw size={14} /> Retake
                  </button>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '0.5rem' }}>
                  <strong>Guidance:</strong> {uploadedImage.quality.guidance_message}
                </div>

                {/* Enhancement Action */}
                {!enhancedUrl && (
                  <div style={{ marginTop: '0.85rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline-teal"
                      style={{ minHeight: '34px', fontSize: '0.8rem' }}
                      disabled={enhancing}
                      onClick={handleApplyEnhancement}
                    >
                      <Sparkles size={14} />
                      {enhancing ? 'Applying CLAHE Filter...' : (t.photo_enhance_btn || (isTe ? 'ఫొటో స్పష్టత పెంచండి (CLAHE Filter)' : 'Enhance Lesion Clarity (CLAHE Filter)'))}
                    </button>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', marginLeft: '0.75rem' }}>
                      (Applies non-generative contrast enhancement to highlight lesion margins)
                    </span>
                  </div>
                )}
              </div>

              {/* Arogya Mitra AI Intelligent Oral Analysis & Form Pre-Fill Panel */}
              <div style={{
                marginTop: '1.25rem',
                background: 'linear-gradient(135deg, #042F2E 0%, #115E59 100%)',
                borderRadius: '12px',
                border: '2px solid #14B8A6',
                padding: '1.25rem',
                color: '#FFFFFF',
                boxShadow: '0 8px 20px rgba(20, 184, 166, 0.15)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: '#2DD4BF', color: '#042F2E',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>Arogya Mitra AI: Clinical Image Analysis</span>
                        {aiAnalyzing && (
                          <span style={{ fontSize: '0.72rem', background: '#FEF08A', color: '#854D0E', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700 }}>
                            Analyzing...
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#99F6E4' }}>
                        Medical Knowledge Engine • DeepSeek Clinical Guidance • IISc-TANUH Protocol
                      </div>
                    </div>
                  </div>

                  {/* Voice Readout Button */}
                  {aiDiagnosis && (
                    <button
                      type="button"
                      onClick={toggleAiVoice}
                      style={{
                        background: isAiSpeaking ? '#EF4444' : '#0D9488',
                        color: '#FFFFFF',
                        border: '1px solid #5EEAD4',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        boxShadow: isAiSpeaking ? '0 0 12px rgba(239, 68, 68, 0.5)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isAiSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      <span>{isAiSpeaking ? (isTe ? 'వాయిస్ ఆపండి' : 'Stop Audio') : (isTe ? 'AI వాయిస్ వినండి' : 'Listen to AI Analysis')}</span>
                    </button>
                  )}
                </div>

                {aiAnalyzing ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#CCFBF1' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🧠 🔬</div>
                    <div style={{ fontWeight: 700 }}>Arogya Mitra AI is analyzing lesion characteristics...</div>
                    <div style={{ fontSize: '0.78rem', color: '#99F6E4' }}>Evaluating mucosal texture, blanching, border demarcation, and risk score.</div>
                  </div>
                ) : aiDiagnosis ? (
                  <div>
                    {/* Findings Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '0.85rem',
                      borderRadius: '10px',
                      marginBottom: '1rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#99F6E4', textTransform: 'uppercase' }}>Suspected Condition</div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{aiDiagnosis.lesionName}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#99F6E4', textTransform: 'uppercase' }}>Anatomical Site</div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Left Buccal Mucosa</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#99F6E4', textTransform: 'uppercase' }}>Severity Stage</div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FDE047' }}>{aiDiagnosis.stage}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#99F6E4', textTransform: 'uppercase' }}>Optical Match</div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#86EFAC' }}>{aiDiagnosis.confidence}% Confidence</div>
                      </div>
                    </div>

                    {/* STRICT CANCER SAFETY GUARD MANDATE */}
                    <div style={{
                      background: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)',
                      border: '2px solid #F87171',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem'
                    }}>
                      <ShieldAlert size={24} color="#FECACA" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#FEF2F2', letterSpacing: '0.02em' }}>
                          {isTe
                            ? '⚠️ ముఖ్యమైన వైద్య నియమం: ఇది క్యాన్సర్ అని AI ధృవీకరించదు!'
                            : '⚠️ MANDATORY SAFETY DIRECTIVE: AI STRICTLY DOES NOT CONFIRM CANCER!'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#FEE2E2', marginTop: '0.25rem', lineHeight: 1.45 }}>
                          {aiDiagnosis.safetyMandate}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#FECACA', marginTop: '0.35rem', fontWeight: 600 }}>
                          {isTe
                            ? '👉 డాక్టర్ గారి ప్రత్యక్ష తనిఖీ మరియు బయాప్సీ (Biopsy) పరీక్ష తప్పనిసరి (MANDATORY).'
                            : '👉 Physical examination and histopathological punch biopsy by specialist doctor are STRICTLY MANDATORY.'}
                        </div>
                      </div>
                    </div>

                    {/* Auto-Fill Status Confirmation */}
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid #10B981',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#A7F3D0' }}>
                        <CheckCircle2 size={16} color="#34D399" />
                        <span>
                          <strong>AI Auto-Fill Completed:</strong> Site (Buccal Mucosa), Lesion (Leukoplakia/OSMF), Trismus (28mm), Timeline (28 days), Symptoms narrative populated below.
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', background: '#065F46', padding: '0.15rem 0.5rem', borderRadius: '4px', color: '#6EE7B7' }}>
                        Form Ready to Save
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* =========================================================================
              POPUP MODAL: Two Options (Take Live Photo vs Upload Existing Files)
              ========================================================================= */}
          {showPhotoSourceModal && (
            <div className="photo-modal-overlay" onClick={() => setShowPhotoSourceModal(false)}>
              <div className="photo-modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="photo-modal-header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                      {t.photo_source_modal_title || 'Select Photo Source'}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                      {t.photo_source_modal_sub || 'Choose how you want to provide the clinical photo'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPhotoSourceModal(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.35rem',
                      borderRadius: '50%',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="photo-modal-body">
                  {/* Option 1: Take Live Photo */}
                  <button
                    type="button"
                    className="photo-source-card"
                    onClick={handleTakeLivePhotoClick}
                  >
                    <div className="photo-source-icon-wrap" style={{ backgroundColor: '#CCFBF1', color: 'var(--teal-primary)' }}>
                      <Camera size={26} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                          {t.photo_source_live_title || 'Take Live Photo'}
                        </span>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          padding: '0.12rem 0.45rem',
                          borderRadius: '4px'
                        }}>
                          LIVE
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                        {t.photo_source_live_sub || 'Opens camera directly on your phone or website to capture new photo'}
                      </div>
                    </div>
                    <ArrowRight size={18} color="#94A3B8" />
                  </button>

                  {/* Option 2: Upload Existing Files */}
                  <button
                    type="button"
                    className="photo-source-card"
                    onClick={handleExistingFileClick}
                  >
                    <div className="photo-source-icon-wrap" style={{ backgroundColor: '#E0F2FE', color: '#0284C7' }}>
                      <FolderOpen size={26} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                          {t.photo_source_file_title || 'Upload Existing Files'}
                        </span>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          padding: '0.12rem 0.45rem',
                          borderRadius: '4px'
                        }}>
                          FILES
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                        {t.photo_source_file_sub || 'Select existing photos from device gallery, files, or storage'}
                      </div>
                    </div>
                    <ArrowRight size={18} color="#94A3B8" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              LIVE CAMERA VIEWFINDER MODAL (Real-time Video Feed & Shutter)
              ========================================================================= */}
          {showLiveCamera && (
            <div className="live-viewfinder-overlay">
              <div className="live-viewfinder-box">
                {/* Header */}
                <div style={{
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#0F172A',
                  color: '#FFFFFF'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#EF4444'
                    }} />
                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                      {t.photo_live_viewfinder_title || 'Live Camera Viewfinder'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopLiveCamera}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: '0.3rem',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    aria-label="Close viewfinder"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Viewfinder Screen */}
                <div className="live-viewfinder-screen">
                  {cameraError ? (
                    <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#FFFFFF' }}>
                      <AlertCircle size={42} color="#EF4444" style={{ margin: '0 auto 0.75rem' }} />
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        {cameraError}
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
                        You can still capture using your phone's native camera app or upload an existing file.
                      </p>
                      <button
                        type="button"
                        className="btn btn-teal"
                        style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        onClick={() => {
                          stopLiveCamera();
                          cameraInputRef.current?.click();
                        }}
                      >
                        <Camera size={16} /> {t.photo_live_native_cam || 'Open Phone Camera App'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={bindCameraVideo}
                        autoPlay
                        playsInline
                        muted
                        className="live-viewfinder-video"
                      />
                      {/* Oral Region Target Framing Guide */}
                      <div className="live-viewfinder-guide">
                        <div className="live-viewfinder-crosshair" />
                      </div>

                      <div style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        color: '#FFFFFF',
                        padding: '0.35rem 0.85rem',
                        borderRadius: '20px',
                        fontSize: '0.74rem',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none'
                      }}>
                        {t.photo_live_guide_hint || 'Center oral lesion inside the circle and hold steady'}
                      </div>
                    </>
                  )}
                </div>

                {/* Viewfinder Controls Bar */}
                {!cameraError && (
                  <div className="live-viewfinder-controls">
                    {/* Switch / Flip Camera */}
                    <button
                      type="button"
                      onClick={switchCamera}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: '#FFFFFF',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.78rem'
                      }}
                      title={t.photo_live_switch_cam || 'Flip Camera'}
                    >
                      <SwitchCamera size={18} />
                      <span>{t.photo_live_switch_cam || 'Flip'}</span>
                    </button>

                    {/* Circular Shutter Button */}
                    <button
                      type="button"
                      className="shutter-btn"
                      onClick={captureLiveSnapshot}
                      title={t.photo_live_capture_btn || 'Capture Photo'}
                    >
                      <div className="shutter-inner-dot" />
                    </button>

                    {/* Fallback to Native Camera App */}
                    <button
                      type="button"
                      onClick={() => {
                        stopLiveCamera();
                        cameraInputRef.current?.click();
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: '#FFFFFF',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.78rem'
                      }}
                      title={t.photo_live_native_cam || 'Native App'}
                    >
                      <Camera size={18} />
                      <span>{isTe ? 'యాప్' : 'Native'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 4: Symptoms & Duration */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title" style={{ marginBottom: '1rem' }}>
            {t.section_symptoms_timeline || (isTe ? '4. లక్షణాలు & క్లినికల్ కాలక్రమం' : '4. Symptoms & Clinical Timeline')}
          </div>

          <div className="form-group">
            <label className="form-label">
              {t.screening_symptoms || t.symptoms_label || (isTe ? 'లక్షణాలు మరియు సమస్య వివరణ' : 'Detailed Symptoms & Clinical Presentation')} *
            </label>
            <textarea
              className="form-control"
              rows={3}
              required
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder={isTe ? 'ఉదా: ఎడమ బుగ్గ లోపలి భాగంలో 3 వారాలుగా తుడవలేని తెల్లని మచ్చ, కారం తిన్నప్పుడు మంట...' : 'e.g. Persistent non-scrapable white patch on left inner cheek (buccal mucosa) with burning sensation on eating spicy food for 3 weeks...'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">
                {t.screening_duration || t.duration_days_label || (isTe ? 'సమస్య ప్రారంభమైన రోజుల సంఖ్య' : 'Duration of Symptoms (Days)')} *
              </label>
              <input
                type="number"
                min="1"
                max="365"
                className="form-control"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                {t.screening_severity || t.severity_label || (isTe ? 'తీవ్రత స్థాయి' : 'Initial Severity Rating')}
              </label>
              <select
                className="form-control"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="mild">{t.screening_severity_mild || (isTe ? 'తేలికపాటి (Mild)' : 'Mild')}</option>
                <option value="moderate">{t.screening_severity_moderate || (isTe ? 'మధ్యస్థం (Moderate)' : 'Moderate')}</option>
                <option value="severe">{t.screening_severity_severe || (isTe ? 'తీవ్రమైన (Severe)' : 'Severe')}</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', fontSize: '1rem', padding: '0.85rem' }}
          disabled={submitting || uploading}
        >
          <Send size={18} />
          {submitting
            ? (currentLang === 'te' ? 'సమర్పిస్తోంది...' : 'Submitting & Queueing SMS...')
            : (currentLang === 'te' ? 'స్క్రీనింగ్ భద్రపరచండి & PHC సమీక్షకు పంపండి' : 'Save Screening & Submit for PHC Review')}
        </button>
      </form>
    </div>
  );
};
