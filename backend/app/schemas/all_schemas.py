from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# ----------------- Auth Schemas -----------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    full_name: str
    role: str
    phc_id: Optional[int] = None
    phc_name: Optional[str] = None
    mandal: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class EmployeeRegisterRequest(BaseModel):
    full_name: str
    role: str = "chw" # chw, phc_staff, doctor, navigator, admin
    phone: str
    phc_name: Optional[str] = "G. Madugula Primary Health Centre"
    mandal: str = "G. Madugula"
    district: str = "Alluri Sitharama Raju"
    state: str = "Andhra Pradesh"
    password: str
    email: Optional[str] = None
    username: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: str
    phc_id: Optional[int] = None
    phc_name: Optional[str] = None
    phone: Optional[str] = None
    mandal: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

class StaffMemberResponse(BaseModel):
    id: int
    full_name: str
    role: str
    phone: Optional[str] = None
    phc_id: Optional[int] = None
    phc_name: Optional[str] = None
    mandal: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    is_active: bool
    created_at: datetime

# ----------------- Patient Schemas -----------------
class PatientCreate(BaseModel):
    full_name: str
    age: int = Field(..., ge=0, le=130)
    gender: str
    phone: str
    preferred_language: str = "te"
    habitation: Optional[str] = "Madugula Colony"
    gram_panchayat: Optional[str] = "G. Madugula"
    mandal: str = "G. Madugula"
    district: str = "Alluri Sitharama Raju"
    address: Optional[str] = None
    phc_id: int

    # Tobacco & Habit Exposure History
    chewing_tobacco: bool = False
    smoking: bool = False
    gutkha: bool = False
    areca_nut: bool = False
    reverse_smoking: bool = False
    alcohol: bool = False
    habits_duration_years: int = 0
    habits_frequency_per_day: Optional[str] = "None"

    consent_granted: bool = True
    consent_notes: Optional[str] = "Digital informed consent confirmed for oral screening and telemedicine"

class PatientResponse(BaseModel):
    id: int
    patient_id_display: str
    full_name: str
    age: int
    gender: str
    phone_masked: str
    preferred_language: str
    habitation: Optional[str] = None
    gram_panchayat: Optional[str] = None
    mandal: str
    district: str
    chewing_tobacco: bool
    smoking: bool
    reverse_smoking: bool
    habits_duration_years: Optional[int] = 0
    phc_id: int
    phc_name: Optional[str] = None
    created_at: datetime

# ----------------- Image & Quality Schemas -----------------
class ImageQualityResult(BaseModel):
    is_blurry: bool
    blur_score: float
    is_dark: bool
    is_overexposed: bool
    luminance_score: float
    resolution_adequate: bool
    quality_state: str
    guidance_message: str

class ImageUploadResponse(BaseModel):
    image_id: int
    original_filename: str
    file_size_bytes: int
    width: int
    height: int
    quality: ImageQualityResult
    preview_url: str

# ----------------- Screening Schemas -----------------
class ScreeningCreate(BaseModel):
    patient_id: int
    phc_id: int
    category: str = "mouth"
    oral_site: str = "buccal_mucosa"       # buccal_mucosa, tongue, palate, floor_of_mouth, gingiva, lip, retromolar
    lesion_type: str = "leukoplakia"      # leukoplakia, erythroplakia, erythroleukoplakia, osmf, persistent_ulcer, growth_mass
    symptoms: str
    duration_days: int = 30
    mouth_opening_mm: Optional[float] = 38.0
    pain_score: int = 0
    bleeding: bool = False
    burning_sensation: bool = True
    severity: str = "moderate"
    image_id: Optional[int] = None

class ScreeningImageResponse(BaseModel):
    id: int
    original_filename: str
    file_size_bytes: int
    width: int
    height: int
    preview_url: str
    enhanced_url: Optional[str] = None
    quality_state: Optional[str] = None
    guidance_message: Optional[str] = None
    body_site: Optional[str] = None

class AIAnalysisResponse(BaseModel):
    id: int
    analysis_id: str = "DEMO-AI-009"
    model_name: str = "IISc TANUH Research Concept Adapter"
    model_version: str = "mock-v1"
    research_label: str = "suspicious_example"
    image_quality: str = "acceptable"
    visual_observations: str
    triage_urgency: str
    requires_clinician_review: bool = True
    clinical_use: bool = False
    warning: str = "NOT FOR CLINICAL USE — RESEARCH DEMO ONLY"
    confidence_disclaimer: str
    recommendations: str
    is_real_inference: bool

class ClinicalReviewCreate(BaseModel):
    review_decision: str  # consultation_booked, repeat_photo, safe_observation, referral_made, biopsy_advised
    doctor_agrees_with_ai: bool = True
    clinical_notes: str
    action_plan: Optional[str] = None

class ClinicalReviewResponse(BaseModel):
    id: int
    reviewer_name: Optional[str] = None
    review_decision: str
    doctor_agrees_with_ai: bool
    clinical_notes: str
    action_plan: Optional[str] = None
    signed_at: datetime
    reviewed_at: datetime

class ScreeningResponse(BaseModel):
    id: int
    reference_id: str
    patient_id: int
    patient_id_display: str
    patient_name: str
    patient_phone_masked: str
    patient_age: int
    patient_gender: str
    mandal: str = "Paderu"
    phc_id: int
    phc_name: str
    category: str = "mouth"
    oral_site: str = "buccal_mucosa"
    lesion_type: str = "leukoplakia"
    symptoms: str
    duration_days: int
    mouth_opening_mm: Optional[float] = None
    pain_score: int = 0
    bleeding: bool = False
    burning_sensation: bool = False
    severity: str
    status: str
    created_at: datetime
    images: List[ScreeningImageResponse] = []
    ai_analysis: Optional[AIAnalysisResponse] = None
    clinical_reviews: List[ClinicalReviewResponse] = []

# ----------------- Appointment & OTP Schemas -----------------
class AppointmentCreate(BaseModel):
    patient_id: int
    phc_id: int
    doctor_id: Optional[int] = None
    screening_id: Optional[int] = None
    scheduled_date: str
    scheduled_time: str
    appointment_type: str = "telemedicine"

class AppointmentReschedule(BaseModel):
    new_date: str
    new_time: str
    reason: str

class AppointmentCancel(BaseModel):
    reason: str

class AppointmentResponse(BaseModel):
    id: int
    reference_id: str
    patient_id: int
    patient_id_display: str
    patient_name: str
    patient_phone_masked: str
    mandal: Optional[str] = None
    phc_id: int
    phc_name: str
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    screening_id: Optional[int] = None
    scheduled_date: str
    scheduled_time: str
    expected_arrival_time: str
    appointment_type: str
    status: str
    checkin_time: Optional[datetime] = None
    created_at: datetime

class OTPRequestPayload(BaseModel):
    patient_id_display: str
    appointment_id: Optional[int] = None

class OTPRequestResponse(BaseModel):
    success: bool
    message: str
    appointment_id: int
    patient_name: str
    masked_phone: str
    resend_cooldown_seconds: int
    expires_in_minutes: int
    dev_otp_preview: Optional[str] = None

class OTPVerifyPayload(BaseModel):
    appointment_id: int
    otp_code: str

class OTPVerifyResponse(BaseModel):
    success: bool
    message: str
    appointment_id: int
    status: str
    checkin_time: datetime

# ----------------- Doctor Queue & Consultation Schemas -----------------
class DoctorQueueItem(BaseModel):
    appointment_id: int
    reference_id: str
    patient_id: int
    patient_id_display: str
    patient_name: str
    patient_age: int
    patient_gender: str
    mandal: Optional[str] = "G. Madugula"
    phc_name: str
    scheduled_time: str
    checkin_time: datetime
    waiting_minutes: int
    oral_site: Optional[str] = None
    lesion_type: Optional[str] = None
    screening_category: Optional[str] = "mouth"
    screening_symptoms: Optional[str] = None
    status: str

class ConsultationAcceptResponse(BaseModel):
    consultation_id: int
    appointment_id: int
    session_token: str
    webrtc_room_id: str
    stun_server: str
    patient_name: str
    patient_age: int
    patient_id: Optional[int] = None
    patient_id_display: Optional[str] = None
    phc_name: Optional[str] = None
    doctor_name: Optional[str] = None
    mandal: Optional[str] = None
    screening_details: Optional[Any] = None

class ConsultationCompletePayload(BaseModel):
    clinical_findings: str
    prescription_notes: Optional[str] = None
    follow_up_instructions: Optional[str] = None
    biopsy_indicated: bool = False
    referral_needed: bool = False
    referral_specialty: Optional[str] = None
    target_hospital: Optional[str] = None
    referral_urgency: Optional[str] = "routine"

# ----------------- MODULE G: BIOPSY & INVESTIGATION SCHEMAS -----------------
class InvestigationCreate(BaseModel):
    patient_id: int
    screening_id: Optional[int] = None
    appointment_id: Optional[int] = None
    kind: str = "incisional_biopsy"  # incisional_biopsy, punch_biopsy, fnac, ct_scan
    biopsy_site: str = "Left Buccal Mucosa"
    state: str = "advised"          # advised, scheduled, sample_collected, report_pending, report_received, clinician_reviewed
    specimen_date: Optional[str] = None
    pathology_finding: Optional[str] = None
    diagnosis_category: str = "precancer_leukoplakia" # benign, precancer_leukoplakia, osmf, oscc_malignancy
    histopathology_summary: Optional[str] = None
    report_file_url: Optional[str] = None

class InvestigationUpdate(BaseModel):
    state: str
    specimen_date: Optional[str] = None
    pathology_finding: Optional[str] = None
    diagnosis_category: Optional[str] = None
    histopathology_summary: Optional[str] = None
    report_file_url: Optional[str] = None

class InvestigationResponse(BaseModel):
    id: int
    investigation_ref: str
    patient_id: int
    patient_id_display: str
    patient_name: str
    kind: str
    biopsy_site: str
    state: str
    diagnosis_category: str
    pathology_finding: Optional[str] = None
    histopathology_summary: Optional[str] = None
    report_file_url: Optional[str] = None
    doctor_name: Optional[str] = None
    created_at: datetime

# ----------------- MODULE I: PATIENT NAVIGATION SCHEMAS -----------------
class NavigationTaskCreate(BaseModel):
    patient_id: int
    task_type: str = "biopsy_transport_escort"
    due_date: Optional[str] = None
    notes: Optional[str] = None

class NavigationTaskUpdate(BaseModel):
    status: str
    contact_attempts_count: Optional[int] = None
    transport_support_arranged: Optional[bool] = None
    feeder_ambulance_notified: Optional[bool] = None
    missed_visit_reason: Optional[str] = None
    notes: Optional[str] = None

class NavigationTaskResponse(BaseModel):
    id: int
    task_ref: str
    patient_id: int
    patient_id_display: str
    patient_name: str
    habitation: Optional[str] = None
    mandal: str
    patient_phone_masked: str
    task_type: str
    status: str
    due_date: Optional[str] = None
    contact_attempts_count: int
    transport_support_arranged: bool
    feeder_ambulance_notified: bool
    missed_visit_reason: Optional[str] = None
    notes: Optional[str] = None
    navigator_name: Optional[str] = None
    screening_id: Optional[int] = None
    ai_call_status: Optional[str] = "pending"
    ai_call_transcript: Optional[str] = None
    duration_suffering_days: Optional[int] = None
    severity_stage: Optional[str] = None
    whatsapp_photo_url: Optional[str] = None
    doctor_reviewed: Optional[bool] = False
    doctor_review_notes: Optional[str] = None
    doctor_reviewed_at: Optional[datetime] = None
    dispatched_to_phc: Optional[bool] = True
    dispatched_to_doctor: Optional[bool] = True
    dispatched_to_dmho: Optional[bool] = True
    created_at: datetime

class AIFollowupRecordPayload(BaseModel):
    duration_suffering_days: int
    severity_stage: str = "Stage I - OPMD Risk"
    ai_call_transcript: str
    mouth_opening_difficulty: bool = False
    habit_status: str = "tobacco_user"
    whatsapp_photos_requested: bool = True
    whatsapp_photo_url: Optional[str] = None

class DoctorReviewPayload(BaseModel):
    doctor_review_notes: str
    clinical_decision: str = "approved_biopsy" # approved_biopsy, conservative_treatment, referral_advised

# ----------------- REFERRAL SLIP SCHEMA -----------------
class ReferralSlipResponse(BaseModel):
    id: int
    referral_slip_number: str
    patient_id_display: str
    patient_name: str
    age: int
    gender: str
    habitation: Optional[str] = None
    mandal: str
    district: str
    originating_phc: str
    target_hospital: str
    specialty_needed: str
    urgency: str
    reason_for_referral: str
    clinical_notes: Optional[str] = None
    scheduled_appointment_date: Optional[str] = None
    attendance_confirmed: bool
    created_at: datetime

# ----------------- Chatbot Schemas -----------------
class ChatMessagePayload(BaseModel):
    session_id: str
    message: str
    language: str = "te"
    attachment_image_id: Optional[int] = None

class ChatMessageResponse(BaseModel):
    id: int
    session_id: str
    role: str
    content: str
    language: str
    has_attachment: bool
    attachment_preview_url: Optional[str] = None
    warning_flag: Optional[str] = None
    disclaimer: str
    created_at: datetime

# ----------------- District Reporting & Analytics -----------------
class DistrictAnalyticsResponse(BaseModel):
    total_screenings: int
    screenings_by_category: dict
    screenings_by_mandal: dict
    precancers_detected: int
    cancers_confirmed: int
    cases_awaiting_review: int
    biopsies_pending: int
    biopsies_completed: int
    total_appointments_booked: int
    verified_arrivals_count: int
    average_wait_duration_minutes: float
    referrals_count: int
    sms_delivery_rate_percent: float
    ai_service_status: str
    total_asha_workers: int = 0
    total_phcs: int = 0
    total_doctors: int = 0
    total_navigators: int = 0
    total_staff: int = 0
    workforce_by_mandal: dict = {}

class AuditEventResponse(BaseModel):
    id: int
    user_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime
