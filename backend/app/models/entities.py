import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Float, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    CHW = "chw"                     # Community Health Worker / ASHA
    PHC_STAFF = "phc_staff"         # PHC Medical Officer / Nurse
    DOCTOR = "doctor"               # Specialist / Telemedicine Doctor
    NAVIGATOR = "navigator"         # Patient Navigator
    ADMIN = "admin"                 # District Administrator

class ScreeningCategory(str, enum.Enum):
    MOUTH = "mouth"
    SKIN = "skin"
    WOUNDS = "wounds"
    EYE = "eye"
    EAR = "ear"
    NOSE = "nose"
    OTHER = "other"

class ScreeningStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    QUALITY_REVIEW = "quality_review"
    UNDER_PHC_REVIEW = "under_phc_review"
    CONSULTATION_RECOMMENDED = "consultation_recommended"
    REPEAT_PHOTO_REQUESTED = "repeat_photo_requested"
    CLOSED = "closed"

class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CHECKIN_INITIATED = "checkin_initiated"
    CHECKED_IN = "checked_in"
    WAITING_FOR_DOCTOR = "waiting_for_doctor"
    IN_CONSULTATION = "in_consultation"
    COMPLETED = "completed"
    RESCHEDULED = "rescheduled"
    CANCELLED = "cancelled"
    NO_SHOW_PENDING = "no_show_pending"
    NO_SHOW_CONFIRMED = "no_show_confirmed"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.CHW)
    phc_id = Column(Integer, ForeignKey("phcs.id", ondelete="SET NULL"), nullable=True)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    phc = relationship("PHC", back_populates="staff_members")
    screenings_created = relationship("Screening", back_populates="creator", foreign_keys="Screening.created_by_user_id")

class PHC(Base):
    __tablename__ = "phcs"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    district = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False, default="Andhra Pradesh")
    pin_code = Column(String(10), nullable=True)
    contact_number = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    staff_members = relationship("User", back_populates="phc")
    patients = relationship("Patient", back_populates="phc")
    appointments = relationship("Appointment", back_populates="phc")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_id_display = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False, index=True)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    preferred_language = Column(String(20), default="te")  # te, en, hi, ta, ml, kn
    address = Column(Text, nullable=True)
    village_town = Column(String(100), nullable=True)
    phc_id = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), nullable=False)
    registered_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    phc = relationship("PHC", back_populates="patients")
    consent_records = relationship("ConsentRecord", back_populates="patient", cascade="all, delete-orphan")
    screenings = relationship("Screening", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")

class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    consent_type = Column(String(100), nullable=False, default="visible_screening_telemedicine")
    granted = Column(Boolean, nullable=False, default=True)
    recorded_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="consent_records")

class Screening(Base):
    __tablename__ = "screenings"

    id = Column(Integer, primary_key=True, index=True)
    reference_id = Column(String(50), unique=True, index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    phc_id = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), nullable=False)
    category = Column(SQLEnum(ScreeningCategory), nullable=False)
    symptoms = Column(Text, nullable=False)
    duration_days = Column(Integer, nullable=False, default=1)
    severity = Column(String(50), default="mild")  # mild, moderate, severe
    status = Column(SQLEnum(ScreeningStatus), default=ScreeningStatus.SUBMITTED, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="screenings")
    creator = relationship("User", back_populates="screenings_created", foreign_keys=[created_by_user_id])
    images = relationship("ScreeningImage", back_populates="screening", cascade="all, delete-orphan")
    ai_analyses = relationship("AIAnalysis", back_populates="screening", cascade="all, delete-orphan")
    clinical_reviews = relationship("ClinicalReview", back_populates="screening", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="screening")

class ScreeningImage(Base):
    __tablename__ = "screening_images"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    screening = relationship("Screening", back_populates="images")
    processing_results = relationship("ImageProcessingResult", back_populates="image", cascade="all, delete-orphan", uselist=False)

class ImageProcessingResult(Base):
    __tablename__ = "image_processing_results"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("screening_images.id", ondelete="CASCADE"), nullable=False)
    is_blurry = Column(Boolean, default=False)
    blur_score = Column(Float, nullable=False)  # Laplacian variance
    is_dark = Column(Boolean, default=False)
    is_overexposed = Column(Boolean, default=False)
    luminance_score = Column(Float, nullable=False)  # Average luminance
    resolution_adequate = Column(Boolean, default=True)
    quality_state = Column(String(50), default="acceptable")  # excellent, acceptable, poor, retake_recommended
    guidance_message = Column(Text, nullable=True)
    enhanced_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    image = relationship("ScreeningImage", back_populates="processing_results")

class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id", ondelete="CASCADE"), nullable=False)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)
    visual_observations = Column(Text, nullable=False)
    triage_urgency = Column(String(50), nullable=False, default="routine")  # routine, priority, urgent_warning
    confidence_disclaimer = Column(Text, nullable=False)
    recommendations = Column(Text, nullable=False)
    is_real_inference = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    screening = relationship("Screening", back_populates="ai_analyses")

class ClinicalReview(Base):
    __tablename__ = "clinical_reviews"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_decision = Column(String(50), nullable=False)  # consultation_booked, repeat_photo, safe_observation, referral_made
    clinical_notes = Column(Text, nullable=False)
    action_plan = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    screening = relationship("Screening", back_populates="clinical_reviews")
    reviewer = relationship("User")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    reference_id = Column(String(50), unique=True, index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    phc_id = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    screening_id = Column(Integer, ForeignKey("screenings.id", ondelete="SET NULL"), nullable=True)
    scheduled_date = Column(String(20), nullable=False)  # YYYY-MM-DD
    scheduled_time = Column(String(20), nullable=False)  # HH:MM (e.g. 11:00)
    expected_arrival_time = Column(String(20), nullable=False)  # 30 mins prior (e.g. 10:30)
    appointment_type = Column(String(50), default="telemedicine")  # telemedicine, in_person
    status = Column(SQLEnum(AppointmentStatus), default=AppointmentStatus.SCHEDULED, index=True)
    cancellation_reason = Column(Text, nullable=True)
    reschedule_reason = Column(Text, nullable=True)
    checkin_time = Column(DateTime, nullable=True)
    consultation_start_time = Column(DateTime, nullable=True)
    consultation_end_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="appointments")
    phc = relationship("PHC", back_populates="appointments")
    doctor = relationship("User", foreign_keys=[doctor_id])
    screening = relationship("Screening", back_populates="appointments")
    events = relationship("AppointmentEvent", back_populates="appointment", cascade="all, delete-orphan")
    otp_record = relationship("OTPVerification", back_populates="appointment", cascade="all, delete-orphan", uselist=False)
    consultation = relationship("Consultation", back_populates="appointment", cascade="all, delete-orphan", uselist=False)

class AppointmentEvent(Base):
    __tablename__ = "appointment_events"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reason = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    appointment = relationship("Appointment", back_populates="events")

class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, unique=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    hashed_otp = Column(String(255), nullable=False)
    salt = Column(String(100), nullable=False)
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    expires_at = Column(DateTime, nullable=False)
    resend_available_at = Column(DateTime, nullable=False)
    verified = Column(Boolean, default=False)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    appointment = relationship("Appointment", back_populates="otp_record")

class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient_phone = Column(String(20), nullable=False)
    message_type = Column(String(50), nullable=False)  # screening_confirmation, appointment_scheduled, otp, reminder
    content = Column(Text, nullable=False)
    provider = Column(String(50), default="synthetic")  # synthetic, twilio, dlt
    provider_message_id = Column(String(100), nullable=True)
    delivery_status = Column(String(50), default="delivered")  # queued, sent, delivered, failed
    retry_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, unique=True)
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    session_token = Column(String(100), nullable=False)
    webrtc_room_id = Column(String(100), nullable=False)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    clinical_findings = Column(Text, nullable=True)
    prescription_notes = Column(Text, nullable=True)
    follow_up_instructions = Column(Text, nullable=True)
    referral_specialty = Column(String(100), nullable=True)
    status = Column(String(50), default="in_progress")  # in_progress, completed, abandoned

    appointment = relationship("Appointment", back_populates="consultation")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True, nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    language = Column(String(20), default="te")
    has_attachment = Column(Boolean, default=False)
    attachment_path = Column(String(500), nullable=True)
    quality_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    originating_phc_id = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), nullable=False)
    specialty_needed = Column(String(100), nullable=False)
    urgency = Column(String(50), default="routine")  # routine, priority, emergency
    target_hospital = Column(String(255), nullable=False)
    status = Column(String(50), default="pending")  # pending, contacted, scheduled, completed
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False, index=True)  # LOGIN, CREATE_SCREENING, VERIFY_OTP, ACCEPT_PATIENT, etc.
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
