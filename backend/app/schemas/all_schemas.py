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

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: str
    phc_id: Optional[int] = None
    phone: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: str
    role: str
    phc_id: Optional[int] = None
    phone: Optional[str] = None

# ----------------- PHC Schemas -----------------
class PHCResponse(BaseModel):
    id: int
    code: str
    name: str
    district: str
    state: str
    pin_code: Optional[str] = None
    contact_number: Optional[str] = None

    class Config:
        from_attributes = True

# ----------------- Patient Schemas -----------------
class PatientCreate(BaseModel):
    full_name: str
    age: int = Field(..., ge=0, le=130)
    gender: str
    phone: str
    preferred_language: str = "te"
    address: Optional[str] = None
    village_town: Optional[str] = None
    phc_id: int
    consent_granted: bool = True
    consent_notes: Optional[str] = None

class PatientResponse(BaseModel):
    id: int
    patient_id_display: str
    full_name: str
    age: int
    gender: str
    phone_masked: str
    preferred_language: str
    village_town: Optional[str] = None
    phc_id: int
    phc_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ConsentResponse(BaseModel):
    id: int
    consent_type: str
    granted: bool
    notes: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

# ----------------- Image & Quality Schemas -----------------
class ImageQualityResult(BaseModel):
    is_blurry: bool
    blur_score: float
    is_dark: bool
    is_overexposed: bool
    luminance_score: float
    resolution_adequate: bool
    quality_state: str  # excellent, acceptable, poor, retake_recommended
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
    category: str  # mouth, skin, wounds, eye, ear, nose, other
    symptoms: str
    duration_days: int = 1
    severity: str = "mild"
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

class AIAnalysisResponse(BaseModel):
    id: int
    model_name: str
    model_version: str
    visual_observations: str
    triage_urgency: str
    confidence_disclaimer: str
    recommendations: str
    is_real_inference: bool

class ClinicalReviewCreate(BaseModel):
    review_decision: str  # consultation_booked, repeat_photo, safe_observation, referral_made
    clinical_notes: str
    action_plan: Optional[str] = None

class ClinicalReviewResponse(BaseModel):
    id: int
    reviewer_name: Optional[str] = None
    review_decision: str
    clinical_notes: str
    action_plan: Optional[str] = None
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
    phc_id: int
    phc_name: str
    category: str
    symptoms: str
    duration_days: int
    severity: str
    status: str
    created_at: datetime
    images: List[ScreeningImageResponse] = []
    ai_analysis: Optional[AIAnalysisResponse] = None
    clinical_reviews: List[ClinicalReviewResponse] = []

    class Config:
        from_attributes = True

# ----------------- Appointment & OTP Schemas -----------------
class AppointmentCreate(BaseModel):
    patient_id: int
    phc_id: int
    doctor_id: Optional[int] = None
    screening_id: Optional[int] = None
    scheduled_date: str  # YYYY-MM-DD
    scheduled_time: str  # HH:MM
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

    class Config:
        from_attributes = True

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
    dev_otp_preview: Optional[str] = None  # Populated only in synthetic dev mode for automated testing

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
    phc_name: str
    scheduled_time: str
    checkin_time: datetime
    waiting_minutes: int
    screening_category: Optional[str] = None
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
    screening_details: Optional[Any] = None

class ConsultationCompletePayload(BaseModel):
    clinical_findings: str
    prescription_notes: Optional[str] = None
    follow_up_instructions: Optional[str] = None
    referral_needed: bool = False
    referral_specialty: Optional[str] = None
    target_hospital: Optional[str] = None
    referral_urgency: Optional[str] = "routine"

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

# ----------------- Reporting & Analytics Schemas -----------------
class DistrictAnalyticsResponse(BaseModel):
    total_screenings: int
    screenings_by_category: dict
    cases_awaiting_review: int
    total_appointments_booked: int
    verified_arrivals_count: int
    average_wait_duration_minutes: float
    referrals_count: int
    sms_delivery_rate_percent: float
    ai_service_status: str

class AuditEventResponse(BaseModel):
    id: int
    user_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime
