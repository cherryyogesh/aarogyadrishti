import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Float, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    CHW = "chw"                     # Community Health Worker / ASHA
    PHC_STAFF = "phc_staff"         # PHC Medical Officer / Dental Officer
    DOCTOR = "doctor"               # Specialist (ENT / Onco / Maxillofacial)
    NAVIGATOR = "navigator"         # Tribal Patient Care Navigator
    ADMIN = "admin"                 # District Administrator / ITDA Project Officer

class OralSite(str, enum.Enum):
    BUCCAL_MUCOSA = "buccal_mucosa"       # Cheeks / Inner cheek lining
    TONGUE = "tongue"                     # Lateral border / Dorsum / Ventral tongue
    FLOOR_OF_MOUTH = "floor_of_mouth"     # Under the tongue
    PALATE = "palate"                     # Hard / Soft Palate
    GINGIVA = "gingiva"                   # Gums / Alveolar ridge
    LIP = "lip"                           # Labial mucosa / Vermilion border
    RETROMOLAR = "retromolar_trigone"     # Behind wisdom teeth
    # Nose & ENT Sites
    NASAL_BRIDGE = "nasal_bridge"
    ALAR_MARGIN = "alar_margin"
    NASAL_SEPTUM = "nasal_septum"
    ANTERIOR_TURBINATE = "anterior_turbinate"
    NASOLABIAL_FOLD = "nasolabial_fold"
    # Eye & Ocular Surface
    CORNEA_LIMBUS = "cornea_limbus"
    BULBAR_CONJUNCTIVA = "bulbar_conjunctiva"
    EYELID_MARGIN = "eyelid_margin"
    INNER_OUTER_CANTHUS = "inner_outer_canthus"
    LACRIMAL_SAC = "lacrimal_sac"
    # Ear & Auricular Sites
    HELIX_ANTIHELIX = "helix_antihelix"
    EAR_LOBULE = "ear_lobule"
    EXTERNAL_AUDITORY_CANAL = "external_auditory_canal"
    RETROAURICULAR_CREASE = "retroauricular_crease"
    CONCHAL_BOWL = "conchal_bowl"
    # Skin & Cutaneous Sites
    FACE_HEAD_NECK = "face_head_neck"
    UPPER_LIMBS = "upper_limbs"
    TRUNK_BACK = "trunk_back"
    LOWER_LIMBS = "lower_limbs"
    ACRAL_PALMS_SOLES = "acral_palms_soles"
    SKINFOLDS = "skinfolds"
    # Wound & Ulcer Sites
    PLANTAR_FOOT_HALLUX = "plantar_foot_hallux"
    MALLEOLUS_LOWER_LEG = "malleolus_lower_leg"
    SACRUM_BUTTOCKS = "sacrum_buttocks"
    SURGICAL_DEHISCENCE = "surgical_dehiscence"
    TRAUMA_EXTREMITY = "trauma_extremity"
    # Other & Lymph Node Sites
    CERVICAL_LYMPH_NODES = "cervical_lymph_nodes"
    AXILLARY_NODES = "axillary_nodes"
    INGUINAL_NODES = "inguinal_nodes"
    ANTERIOR_NECK_THYROID = "anterior_neck_thyroid"
    SUBCUTANEOUS_SOFT_TISSUE = "subcutaneous_soft_tissue"
    OTHER = "other_oral_cavity"

class LesionType(str, enum.Enum):
    LEUKOPLAKIA = "leukoplakia"               # White patch (cannot be wiped away)
    ERYTHROPLAKIA = "erythroplakia"           # Red velvety patch (high malignant risk)
    ERYTHROLEUKOPLAKIA = "erythroleukoplakia" # Mixed red & white
    OSMF = "osmf"                             # Oral Submucous Fibrosis (restricted mouth opening)
    PERSISTENT_ULCER = "persistent_ulcer"     # Non-healing ulcer > 2-3 weeks
    GROWTH_MASS = "growth_mass"               # Exophytic vegetative growth
    LICHEN_PLANUS = "lichen_planus"           # Wickham striae / reticular pattern
    # Nose
    BLEEDING_ULCER = "bleeding_ulcer"
    NASAL_POLYP = "nasal_polyp"
    CRUSTED_PLAQUE = "crusted_plaque"
    SEPTAL_PERFORATION = "septal_perforation"
    PEARLY_NODULE_BCC = "pearly_nodule_bcc"
    VESTIBULITIS = "vestibulitis"
    # Eye
    PTERYGIUM = "pterygium"
    PINGUECULA = "pinguecula"
    MARGINAL_ULCER = "marginal_ulcer"
    CORNEAL_INFILTRATE = "corneal_infiltrate"
    OSSN_NEOPLASIA = "ossn_neoplasia"
    CHALAZION_MASS = "chalazion_mass"
    # Ear
    SCALC_ULCER = "scalc_ulcer"
    CSOM_DISCHARGE = "csom_discharge"
    HEMATOMA_SEROMA = "hematoma_seroma"
    PIGMENTED_MACULE = "pigmented_macule"
    OTOMYCOSIS = "otomycosis"
    KELOID_FIBROMA = "keloid_fibroma"
    # Skin
    MELANOMA_ABCDE = "melanoma_abcde"
    BCC_PEARLY = "bcc_pearly"
    SCC_INDURATED = "scc_indurated"
    ACTINIC_KERATOSIS = "actinic_keratosis"
    PSORIASIS_ECZEMA = "psoriasis_eczema"
    HYPOPIGMENTED_PATCH = "hypopigmented_patch"
    # Wounds
    GRANULATION_RED = "granulation_red"
    YELLOW_SLOUGH = "yellow_slough"
    BLACK_ESCHAR_GANGRENE = "black_eschar_gangrene"
    MACERATED_EDGE = "macerated_edge"
    DEEP_BONE_PROBING = "deep_bone_probing"
    CELLULITIC_WOUND = "cellulitic_wound"
    # Other
    HARD_FIXED_MASS = "hard_fixed_mass"
    SOFT_MOBILE_LIPOMA = "soft_mobile_lipoma"
    TENDER_LYMPHADENOPATHY = "tender_lymphadenopathy"
    CYSTIC_SWELLING = "cystic_swelling"
    THYROID_NODULE = "thyroid_nodule"
    OTHER = "other_abnormality"

class ScreeningStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    QUALITY_REVIEW = "quality_review"
    UNDER_PHC_REVIEW = "under_phc_review"
    CONSULTATION_RECOMMENDED = "consultation_recommended"
    REPEAT_PHOTO_REQUESTED = "repeat_photo_requested"
    BIOPSY_ORDERED = "biopsy_ordered"
    CLOSED = "closed"

class AppointmentStatus(str, enum.Enum):
    REQUESTED = "requested"
    SCHEDULED = "scheduled"
    CHECKIN_INITIATED = "checkin_initiated"
    CHECKED_IN = "checked_in"
    WAITING_FOR_DOCTOR = "waiting_for_doctor"
    IN_CONSULTATION = "in_consultation"
    COMPLETED = "completed"
    RESCHEDULED = "rescheduled"
    CANCELLED = "cancelled"
    MISSED = "missed"
    NO_SHOW_CONFIRMED = "no_show_confirmed"

class InvestigationState(str, enum.Enum):
    ADVISED = "advised"
    SCHEDULED = "scheduled"
    SAMPLE_COLLECTED = "sample_collected"
    REPORT_PENDING = "report_pending"
    REPORT_RECEIVED = "report_received"
    CLINICIAN_REVIEWED = "clinician_reviewed"

class NavigationStatus(str, enum.Enum):
    PENDING = "pending"
    CONTACTED = "contacted"
    TRANSPORT_ARRANGED = "transport_arranged"
    ATTENDED = "attended"
    MISSED_ESCALATED = "missed_escalated"
    COMPLETED = "completed"

# ----------------- ENTITIES -----------------

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
    mandal = Column(String(100), nullable=True, default="G. Madugula")
    district = Column(String(100), nullable=True, default="Alluri Sitharama Raju")
    state = Column(String(100), nullable=True, default="Andhra Pradesh")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    phc = relationship("PHC", back_populates="staff_members")
    screenings_created = relationship("Screening", back_populates="creator", foreign_keys="Screening.created_by_user_id")

class PHC(Base):
    __tablename__ = "phcs"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    mandal = Column(String(100), nullable=False, default="G. Madugula", index=True)
    district = Column(String(100), nullable=False, default="Alluri Sitharama Raju", index=True)
    itda_centre = Column(String(100), nullable=False, default="ITDA Paderu")
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
    preferred_language = Column(String(20), default="te")  # te, en, hi

    # Tribal Demography & Habitation
    habitation = Column(String(100), nullable=True)
    gram_panchayat = Column(String(100), nullable=True)
    mandal = Column(String(100), nullable=False, default="G. Madugula")
    district = Column(String(100), nullable=False, default="Alluri Sitharama Raju")
    address = Column(Text, nullable=True)

    # Tobacco & Habit Exposure History
    chewing_tobacco = Column(Boolean, default=False)
    smoking = Column(Boolean, default=False)
    gutkha = Column(Boolean, default=False)
    areca_nut = Column(Boolean, default=False)
    reverse_smoking = Column(Boolean, default=False)  # High prevalence in tribal areas (chutta)
    alcohol = Column(Boolean, default=False)
    habits_duration_years = Column(Integer, default=0)
    habits_frequency_per_day = Column(String(50), default="None")

    phc_id = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), nullable=False)
    registered_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    phc = relationship("PHC", back_populates="patients")
    consent_records = relationship("ConsentRecord", back_populates="patient", cascade="all, delete-orphan")
    screenings = relationship("Screening", back_populates="patient", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    investigations = relationship("Investigation", back_populates="patient", cascade="all, delete-orphan")
    navigation_tasks = relationship("NavigationTask", back_populates="patient", cascade="all, delete-orphan")

class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    consent_type = Column(String(100), nullable=False, default="oral_screening_imaging_telemedicine")
    granted = Column(Boolean, nullable=False, default=True)
    recorded_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    language = Column(String(20), default="te")
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="consent_records")

class Screening(Base):
    __tablename__ = "screenings"

    id = Column(Integer, primary_key=True, index=True)
    reference_id = Column(String(50), unique=True, index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    phc_id = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), nullable=False)

    # Oral Screening Specifics
    category = Column(String(50), default="mouth")
    oral_site = Column(SQLEnum(OralSite), default=OralSite.BUCCAL_MUCOSA)
    lesion_type = Column(SQLEnum(LesionType), default=LesionType.LEUKOPLAKIA)
    symptoms = Column(Text, nullable=False)
    duration_days = Column(Integer, nullable=False, default=30)
    mouth_opening_mm = Column(Float, nullable=True) # Useful for OSMF (restricted opening)
    pain_score = Column(Integer, default=0)         # 0-10 scale
    bleeding = Column(Boolean, default=False)
    burning_sensation = Column(Boolean, default=True)
    severity = Column(String(50), default="moderate")

    status = Column(SQLEnum(ScreeningStatus), default=ScreeningStatus.UNDER_PHC_REVIEW, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="screenings")
    phc = relationship("PHC")
    creator = relationship("User", back_populates="screenings_created", foreign_keys=[created_by_user_id])
    images = relationship("ScreeningImage", back_populates="screening", cascade="all, delete-orphan")
    ai_analyses = relationship("AIAnalysis", back_populates="screening", cascade="all, delete-orphan")
    clinical_reviews = relationship("ClinicalReview", back_populates="screening", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="screening")
    investigations = relationship("Investigation", back_populates="screening")

class ScreeningImage(Base):
    __tablename__ = "screening_images"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id", ondelete="CASCADE"), nullable=True)
    original_filename = Column(String(255), nullable=False)
    stored_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    body_site = Column(String(100), default="buccal_mucosa")
    checksum = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    screening = relationship("Screening", back_populates="images")
    processing_results = relationship("ImageProcessingResult", back_populates="image", cascade="all, delete-orphan", uselist=False)

class ImageProcessingResult(Base):
    __tablename__ = "image_processing_results"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("screening_images.id", ondelete="CASCADE"), nullable=False)
    is_blurry = Column(Boolean, default=False)
    blur_score = Column(Float, nullable=False)
    is_dark = Column(Boolean, default=False)
    is_overexposed = Column(Boolean, default=False)
    luminance_score = Column(Float, nullable=False)
    resolution_adequate = Column(Boolean, default=True)
    quality_state = Column(String(50), default="acceptable")
    guidance_message = Column(Text, nullable=True)
    enhanced_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    image = relationship("ScreeningImage", back_populates="processing_results")

class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id", ondelete="CASCADE"), nullable=False)
    analysis_id = Column(String(50), default="DEMO-AI-001")
    model_name = Column(String(100), default="IISc TANUH Research Concept Adapter")
    model_version = Column(String(50), default="mock-v1")
    research_label = Column(String(100), default="suspicious_example")
    image_quality = Column(String(50), default="acceptable")
    visual_observations = Column(Text, nullable=False)
    triage_urgency = Column(String(50), default="priority")
    requires_clinician_review = Column(Boolean, default=True)
    clinical_use = Column(Boolean, default=False)
    warning = Column(String(255), default="NOT FOR CLINICAL USE — RESEARCH DEMO ONLY")
    confidence_disclaimer = Column(Text, nullable=False)
    recommendations = Column(Text, nullable=False)
    is_real_inference = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    screening = relationship("Screening", back_populates="ai_analyses")

class ClinicalReview(Base):
    __tablename__ = "clinical_reviews"

    id = Column(Integer, primary_key=True, index=True)
    screening_id = Column(Integer, ForeignKey("screenings.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_decision = Column(String(50), nullable=False)  # consultation_booked, repeat_photo, safe_observation, referral_made, biopsy_advised
    doctor_agrees_with_ai = Column(Boolean, default=True)
    clinical_notes = Column(Text, nullable=False)
    action_plan = Column(Text, nullable=True)
    signed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    screening = relationship("Screening", back_populates="clinical_reviews")
    reviewer = relationship("User", foreign_keys=[doctor_id])

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    reference_id = Column(String(50), unique=True, index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    phc_id = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    screening_id = Column(Integer, ForeignKey("screenings.id", ondelete="SET NULL"), nullable=True)
    scheduled_date = Column(String(20), nullable=False)
    scheduled_time = Column(String(20), nullable=False)
    expected_arrival_time = Column(String(20), nullable=False)
    appointment_type = Column(String(50), default="telemedicine")
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
    investigations = relationship("Investigation", back_populates="appointment")

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

# ----------------- MODULE G: DIAGNOSTIC INVESTIGATION & BIOPSY -----------------

class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(Integer, primary_key=True, index=True)
    investigation_ref = Column(String(50), unique=True, index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    screening_id = Column(Integer, ForeignKey("screenings.id", ondelete="SET NULL"), nullable=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    kind = Column(String(50), default="incisional_biopsy")  # incisional_biopsy, punch_biopsy, fnac, ct_scan
    biopsy_site = Column(String(100), default="Left Buccal Mucosa")
    state = Column(SQLEnum(InvestigationState), default=InvestigationState.ADVISED, index=True)
    ordered_by_doctor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    specimen_date = Column(DateTime, nullable=True)
    pathology_finding = Column(Text, nullable=True)
    diagnosis_category = Column(String(100), default="precancer_leukoplakia")  # benign, precancer_leukoplakia, osmf, oscc_malignancy
    histopathology_summary = Column(Text, nullable=True)
    report_file_url = Column(String(500), nullable=True)
    clinician_reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="investigations")
    screening = relationship("Screening", back_populates="investigations")
    appointment = relationship("Appointment", back_populates="investigations")
    doctor = relationship("User", foreign_keys=[ordered_by_doctor_id])

# ----------------- MODULE I: PATIENT NAVIGATION & FOLLOW-UP -----------------

class NavigationTask(Base):
    __tablename__ = "navigation_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_ref = Column(String(50), unique=True, index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    assigned_navigator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    task_type = Column(String(100), default="biopsy_transport_escort")  # biopsy_transport_escort, specialist_visit, treatment_linkage, missed_visit_followup
    status = Column(SQLEnum(NavigationStatus), default=NavigationStatus.PENDING, index=True)
    due_date = Column(String(20), nullable=True)
    contact_attempts_count = Column(Integer, default=0)
    last_contact_date = Column(DateTime, nullable=True)
    transport_support_arranged = Column(Boolean, default=False)
    feeder_ambulance_notified = Column(Boolean, default=False) # Tribal feeder ambulance (108)
    missed_visit_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    screening_id = Column(Integer, ForeignKey("screenings.id", ondelete="SET NULL"), nullable=True)
    ai_call_status = Column(String(50), default="pending")  # pending, in_progress, completed
    ai_call_transcript = Column(Text, nullable=True)
    duration_suffering_days = Column(Integer, nullable=True)
    severity_stage = Column(String(100), nullable=True)
    whatsapp_photo_url = Column(String(500), nullable=True)
    doctor_reviewed = Column(Boolean, default=False)
    doctor_review_notes = Column(Text, nullable=True)
    doctor_reviewed_at = Column(DateTime, nullable=True)
    dispatched_to_phc = Column(Boolean, default=True)
    dispatched_to_doctor = Column(Boolean, default=True)
    dispatched_to_dmho = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="navigation_tasks")
    navigator = relationship("User", foreign_keys=[assigned_navigator_id])
    screening = relationship("Screening")

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
    biopsy_indicated = Column(Boolean, default=False)
    status = Column(String(50), default="in_progress")

    appointment = relationship("Appointment", back_populates="consultation")

class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    referral_slip_number = Column(String(50), unique=True, index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    originating_phc_id = Column(Integer, ForeignKey("phcs.id", ondelete="CASCADE"), nullable=False)
    specialty_needed = Column(String(100), default="Head & Neck / Surgical Oncology")
    urgency = Column(String(50), default="priority")  # routine, priority, urgent
    target_hospital = Column(String(255), default="District Hospital Paderu / KGH Visakhapatnam")
    reason_for_referral = Column(Text, nullable=False)
    clinical_notes = Column(Text, nullable=True)
    status = Column(String(50), default="confirmed")
    scheduled_appointment_date = Column(String(20), nullable=True)
    attendance_confirmed = Column(Boolean, default=False)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")
    originating_phc = relationship("PHC")
    creator = relationship("User", foreign_keys=[created_by_id])

class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipient_phone = Column(String(20), nullable=False)
    message_type = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    provider = Column(String(50), default="synthetic")
    provider_message_id = Column(String(100), nullable=True)
    delivery_status = Column(String(50), default="delivered")
    retry_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True, nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    language = Column(String(20), default="te")
    has_attachment = Column(Boolean, default=False)
    attachment_path = Column(String(500), nullable=True)
    quality_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
