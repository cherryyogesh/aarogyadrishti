export type UserRole = 'chw' | 'phc_staff' | 'doctor' | 'navigator' | 'admin';

export type LanguageCode = 'te' | 'en' | 'hi' | 'ta' | 'ml' | 'kn';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  phc_id?: number | null;
  phc_name?: string | null;
  phone?: string | null;
  is_active: boolean;
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
  phc_id: number;
  phc_name: string;
  category: 'mouth' | 'skin' | 'wounds' | 'eye' | 'ear' | 'nose' | 'other';
  symptoms: string;
  duration_days: number;
  severity: string;
  status: string;
  created_at: string;
  images: ScreeningImage[];
  ai_analysis?: AIAnalysis | null;
  clinical_reviews: ClinicalReview[];
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
  phc_name: string;
  scheduled_time: string;
  checkin_time: string;
  waiting_minutes: number;
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
  cases_awaiting_review: number;
  total_appointments_booked: number;
  verified_arrivals_count: number;
  average_wait_duration_minutes: number;
  referrals_count: number;
  sms_delivery_rate_percent: number;
  ai_service_status: string;
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
