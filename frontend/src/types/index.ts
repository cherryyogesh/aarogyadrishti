export type UserRole = 'chw' | 'phc_staff' | 'doctor' | 'navigator' | 'admin';

export type LanguageCode = 'te' | 'en' | 'hi';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  phc_id?: number | null;
  phc_name?: string | null;
  phone?: string | null;
  mandal?: string | null;
  district?: string | null;
  state?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface StaffMember {
  id: number;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  phc_id?: number | null;
  phc_name?: string | null;
  mandal?: string | null;
  district?: string | null;
  state?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeRegisterPayload {
  full_name: string;
  role: UserRole;
  phone: string;
  phc_name?: string;
  mandal: string;
  district: string;
  state: string;
  password: string;
}

export interface ForgotPasswordRequestResponse {
  success: boolean;
  message: string;
  masked_phone: string;
  cooldown_seconds: number;
}

export interface ForgotPasswordResetResponse {
  success: boolean;
  message: string;
  phone: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Patient {
  id: number;
  patient_id_display: string;
  full_name: string;
  age: number;
  gender: string;
  phone_masked: string;
  preferred_language: string;
  village_town?: string | null;
  habitation?: string | null;
  gram_panchayat?: string | null;
  mandal?: string;
  district?: string;
  chewing_tobacco?: boolean;
  smoking?: boolean;
  reverse_smoking?: boolean;
  gutkha?: boolean;
  areca_nut?: boolean;
  alcohol?: boolean;
  habits_duration_years?: number;
  habits_frequency_per_day?: string;
  phc_id: number;
  phc_name?: string | null;
  created_at: string;
}

export interface ConsentRecord {
  id: number;
  consent_type: string;
  granted: boolean;
  notes?: string | null;
  timestamp: string;
}

export interface ImageQualityResult {
  is_blurry: boolean;
  blur_score: number;
  is_dark: boolean;
  is_overexposed: boolean;
  luminance_score: number;
  resolution_adequate: boolean;
  quality_state: 'excellent' | 'acceptable' | 'poor' | 'retake_recommended';
  guidance_message: string;
}

export interface ImageUploadResponse {
  image_id: number;
  original_filename: string;
  file_size_bytes: number;
  width: number;
  height: number;
  quality: ImageQualityResult;
  preview_url: string;
}

export interface ScreeningImage {
  id: number;
  original_filename: string;
  file_size_bytes: number;
  width: number;
  height: number;
  preview_url: string;
  enhanced_url?: string | null;
  quality_state?: string | null;
  guidance_message?: string | null;
}

export interface AIAnalysis {
  id: number;
  model_name: string;
  model_version: string;
  visual_observations: string;
  triage_urgency: 'routine' | 'priority' | 'urgent_warning';
  confidence_disclaimer: string;
  recommendations: string;
  is_real_inference: boolean;
}

export interface ClinicalReview {
  id: number;
  reviewer_name?: string | null;
  review_decision: string;
  clinical_notes: string;
  action_plan?: string | null;
  reviewed_at: string;
}

export interface Screening {
  id: number;
  reference_id: string;
  patient_id: number;
  patient_id_display: string;
  patient_name: string;
  patient_phone_masked: string;
  patient_age: number;
  patient_gender: string;
  mandal?: string;
  phc_id: number;
  phc_name: string;
  category: 'mouth' | 'skin' | 'wounds' | 'eye' | 'ear' | 'nose' | 'other';
  oral_site?: string;
  lesion_type?: string;
  mouth_opening_mm?: number | null;
  pain_score?: number;
  bleeding?: boolean;
  burning_sensation?: boolean;
  symptoms: string;
  duration_days: number;
  severity: string;
  status: string;
  created_at: string;
  images: ScreeningImage[];
  ai_analysis?: AIAnalysis | null;
  clinical_reviews: ClinicalReview[];
}

// Diagnostic Biopsy & Pathology Investigations
export interface Investigation {
  id: number;
  investigation_ref: string;
  patient_id: number;
  patient_id_display: string;
  patient_name: string;
  kind: string;
  biopsy_site: string;
  state: 'advised' | 'scheduled' | 'sample_collected' | 'report_pending' | 'report_received' | 'clinician_reviewed';
  diagnosis_category: string;
  pathology_finding?: string | null;
  histopathology_summary?: string | null;
  report_file_url?: string | null;
  doctor_name?: string | null;
  created_at: string;
}

// Tribal Patient Navigation & Support
export interface NavigationTask {
  id: number;
  task_ref: string;
  patient_id: number;
  patient_id_display: string;
  patient_name: string;
  habitation?: string | null;
  mandal: string;
  patient_phone_masked: string;
  task_type: string;
  status: 'pending' | 'contacted' | 'transport_arranged' | 'attended' | 'missed_escalated' | 'completed';
  due_date?: string | null;
  contact_attempts_count: number;
  transport_support_arranged: boolean;
  feeder_ambulance_notified: boolean;
  missed_visit_reason?: string | null;
  notes?: string | null;
  navigator_name?: string | null;
  screening_id?: number | null;
  ai_call_status?: string | null;
  ai_call_transcript?: string | null;
  duration_suffering_days?: number | null;
  severity_stage?: string | null;
  whatsapp_photo_url?: string | null;
  doctor_reviewed?: boolean;
  doctor_review_notes?: string | null;
  doctor_reviewed_at?: string | null;
  dispatched_to_phc?: boolean;
  dispatched_to_doctor?: boolean;
  dispatched_to_dmho?: boolean;
  created_at: string;
}

// Hospital Referral Slips
export interface ReferralSlip {
  id: number;
  referral_slip_number: string;
  patient_id_display: string;
  patient_name: string;
  age: number;
  gender: string;
  habitation?: string | null;
  mandal: string;
  district: string;
  originating_phc: string;
  target_hospital: string;
  specialty_needed: string;
  urgency: string;
  reason_for_referral: string;
  clinical_notes?: string | null;
  scheduled_appointment_date?: string | null;
  attendance_confirmed: boolean;
  created_at: string;
}

export type AppointmentStatus =
  | 'scheduled'
  | 'checkin_initiated'
  | 'checked_in'
  | 'waiting_for_doctor'
  | 'in_consultation'
  | 'completed'
  | 'rescheduled'
  | 'cancelled'
  | 'no_show_pending'
  | 'no_show_confirmed';

export interface Appointment {
  id: number;
  reference_id: string;
  patient_id: number;
  patient_id_display: string;
  patient_name: string;
  patient_phone_masked: string;
  phc_id: number;
  phc_name: string;
  doctor_id?: number | null;
  doctor_name?: string | null;
  screening_id?: number | null;
  scheduled_date: string;
  scheduled_time: string;
  expected_arrival_time: string;
  appointment_type: string;
  status: AppointmentStatus;
  checkin_time?: string | null;
  created_at: string;
}

export interface DoctorQueueItem {
  appointment_id: number;
  reference_id: string;
  patient_id: number;
  patient_id_display: string;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  mandal?: string;
  phc_name: string;
  scheduled_time: string;
  checkin_time: string;
  waiting_minutes: number;
  oral_site?: string | null;
  lesion_type?: string | null;
  screening_category?: string | null;
  screening_symptoms?: string | null;
  status: string;
}

export interface ConsultationSession {
  consultation_id: number;
  appointment_id: number;
  session_token: string;
  webrtc_room_id: string;
  stun_server: string;
  patient_name: string;
  patient_age: number;
  patient_id?: number;
  patient_id_display?: string;
  phc_name?: string;
  doctor_name?: string;
  mandal?: string;
  screening_details?: any;
}

export interface ChatMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  language: string;
  has_attachment: boolean;
  attachment_preview_url?: string | null;
  warning_flag?: string | null;
  disclaimer: string;
  created_at: string;
}

export interface DistrictAnalytics {
  total_screenings: number;
  screenings_by_category: Record<string, number>;
  screenings_by_mandal: Record<string, number>;
  precancers_detected: number;
  cancers_confirmed: number;
  cases_awaiting_review: number;
  biopsies_pending: number;
  biopsies_completed: number;
  total_appointments_booked: number;
  verified_arrivals_count: number;
  average_wait_duration_minutes: number;
  referrals_count: number;
  sms_delivery_rate_percent: number;
  ai_service_status: string;
  total_asha_workers?: number;
  total_phcs?: number;
  total_doctors?: number;
  total_navigators?: number;
  total_staff?: number;
  workforce_by_mandal?: Record<string, {
    phcs: number;
    asha_workers: number;
    doctors: number;
    screenings: number;
  }>;
}

export interface AuditEvent {
  id: number;
  user_name?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
  timestamp: string;
}

// ----------------- AAROGYA MYTRA AI TYPES (MedGemma 1.5 4B & Evidence RAG) -----------------
export interface ImageQualityDetail {
  status: 'adequate' | 'inadequate' | 'unknown';
  blur_score?: number | null;
  luminance_score?: number | null;
  limitations: string[];
}

export interface ObservationExplanation {
  name: string;
  reasoning: string;
  supporting_observations: string[];
  limitations: string[];
}

export interface MedicalReferenceDetail {
  reference_id: string;
  title: string;
  publisher: string;
  publication_date: string;
  version: string;
  source_url: string;
  section: string;
  review_status: string;
  last_checked: string;
  direct_excerpt: string;
  key_clinical_rules: string[];
}

export interface MytraAnalysisRequest {
  image_id: number;
  patient_id?: number;
  screening_id?: number;
  category: string;
  body_site?: string;
  main_concern?: string;
  symptoms: string;
  duration_days: number;
  evolution?: string;
  mouth_opening_mm?: number;
  pain_score?: number;
  bleeding?: boolean;
  burning_sensation?: boolean;
  patient_consent_recorded: boolean;
  language: string;
}

export interface StakeholderViews {
  patient?: {
    title?: string;
    summary?: string;
    home_care?: string[];
    doctor_reason?: string;
  };
  asha?: {
    title?: string;
    action_urgency?: string;
    field_checklist?: string[];
    referral_step?: string;
  };
  doctor?: {
    title?: string;
    clinical_features?: string[];
    differential_considerations?: string[];
    clinical_protocol?: string;
  };
}

export interface MytraAnalysisResponse {
  assessment_id: string;
  assessment_status: 'preliminary' | 'quality_check_failed' | 'unsupported_category' | 'clinician_reviewed' | 'analysis_failed';
  image_category: string;
  image_quality: ImageQualityDetail;
  visible_observations: string[];
  possible_explanations: ObservationExplanation[];
  missing_information: string[];
  red_flags: string[];
  recommended_next_step: string;
  urgency: 'routine_review' | 'prompt_assessment' | 'urgent_care';
  urgency_reason: string;
  medical_references: MedicalReferenceDetail[];
  cancer_safety_notice: string;
  model_name: string;
  model_version: string;
  created_at: string;
  clinician_review_status: 'pending' | 'approved' | 'amended' | 'rejected';
  guidance_message?: string | null;
  stakeholder_views?: StakeholderViews;
  audit_trail?: any[];
}

export interface ClinicianReviewAmendPayload {
  decision: 'approved' | 'amended' | 'rejected';
  clinician_notes: string;
  amended_observations?: string[];
  action_plan?: string;
  disagree_reason?: string;
}

export interface ConfigStatus {
  app_name: string;
  environment: string;
  database: {
    type: string;
    url_configured: boolean;
  };
  sms_provider: {
    provider: string;
    is_configured: boolean;
    synthetic_dev_mode: boolean;
    label: string;
  };
  ai_service: {
    model_id: string;
    is_configured: boolean;
    provider: string;
    safety_guardrails_active: boolean;
  };
  telemedicine: {
    webrtc_support: boolean;
    stun_server: string;
    turn_configured: boolean;
  };
  storage: {
    directory: string;
    max_upload_mb: number;
  };
}
