import os
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

# Add parent directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash, generate_secure_otp, hash_otp
from app.models.entities import (
    User, PHC, Patient, ConsentRecord, Screening, ScreeningImage,
    ImageProcessingResult, AIAnalysis, ClinicalReview, Appointment,
    AppointmentEvent, OTPVerification, NotificationLog, Consultation,
    Investigation, NavigationTask, Referral,
    UserRole, ScreeningStatus, AppointmentStatus,
    OralSite, LesionType, InvestigationState, NavigationStatus
)

def seed_database(reset: bool = False):
    print("Initializing database tables...")
    if reset:
        print("Reset flag provided. Dropping existing tables and rebuilding...")
        Base.metadata.drop_all(bind=engine)
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if not reset and db.query(User).count() > 0:
            print("Database already contains data. Skipping re-seed. (Use --reset to refresh)")
            return

        print("Seeding ITDA Paderu PHCs and Area Hospitals...")
        phc_g_madugula = PHC(
            code="PHC-GMD-01",
            name="G. Madugula Primary Health Centre",
            district="Alluri Sitharama Raju",
            state="Andhra Pradesh",
            pin_code="531027",
            contact_number="+91 89352 23101"
        )
        phc_paderu = PHC(
            code="CHC-PDR-02",
            name="Paderu Community Health Centre / Area Hospital",
            district="Alluri Sitharama Raju",
            state="Andhra Pradesh",
            pin_code="531077",
            contact_number="+91 89352 24200"
        )
        phc_araku = PHC(
            code="AH-ARK-03",
            name="Araku Valley Area Hospital",
            district="Alluri Sitharama Raju",
            state="Andhra Pradesh",
            pin_code="531149",
            contact_number="+91 89362 25300"
        )
        db.add_all([phc_g_madugula, phc_paderu, phc_araku])
        db.flush()

        print("Seeding Users across all roles...")
        users = [
            User(
                email="chw@aarogya.gov.in",
                username="chw_sarala",
                hashed_password=get_password_hash("ChwPass@2026"),
                full_name="Sarala Devi (ASHA / CHW)",
                role=UserRole.CHW,
                phc_id=phc_g_madugula.id,
                phone="+91 98480 11001"
            ),
            User(
                email="mo@aarogya.gov.in",
                username="mo_ramesh",
                hashed_password=get_password_hash("MoPass@2026"),
                full_name="Dr. Ramesh Babu (Medical Officer)",
                role=UserRole.PHC_STAFF,
                phc_id=phc_g_madugula.id,
                phone="+91 98480 11002"
            ),
            User(
                email="doctor@aarogya.gov.in",
                username="dr_priya",
                hashed_password=get_password_hash("DocPass@2026"),
                full_name="Dr. Priya Sundaram (Head & Neck Specialist)",
                role=UserRole.DOCTOR,
                phc_id=phc_paderu.id,
                phone="+91 98480 11003"
            ),
            User(
                email="navigator@aarogya.gov.in",
                username="nav_vijay",
                hashed_password=get_password_hash("NavPass@2026"),
                full_name="Vijay Krishna (Tribal Patient Navigator)",
                role=UserRole.NAVIGATOR,
                phc_id=phc_paderu.id,
                phone="+91 98480 11004"
            ),
            User(
                email="admin@aarogya.gov.in",
                username="admin_district",
                hashed_password=get_password_hash("AdminPass@2026"),
                full_name="District Project Officer (ITDA Paderu)",
                role=UserRole.ADMIN,
                phc_id=None,
                phone="+91 98480 11005"
            ),
        ]
        db.add_all(users)
        db.flush()

        print("Seeding Compulsory Hackathon Demonstration Case (46-year-old from G. Madugula)...")
        # Patient 1: The compulsory demonstration patient
        patient_ramu = Patient(
            patient_id_display="AD-ASR-10492",
            full_name="Ramu Somulu",
            age=46,
            gender="Male",
            phone="+91 94912 34567",
            preferred_language="te",
            address="Door No. 3-45, Kothaveedhi, G. Madugula",
            habitation="Vanabhasingi",
            gram_panchayat="G. Madugula",
            mandal="G. Madugula",
            district="Alluri Sitharama Raju",
            chewing_tobacco=True,
            smoking=True,
            reverse_smoking=True,
            gutkha=True,
            areca_nut=True,
            alcohol=False,
            habits_duration_years=22,
            habits_frequency_per_day="6-8 times/day",
            phc_id=phc_g_madugula.id,
            registered_by_user_id=users[0].id
        )

        # Patient 2: 52-year-old female from Araku Valley
        patient_kondamma = Patient(
            patient_id_display="AD-ASR-10493",
            full_name="Kondamma Pangi",
            age=52,
            gender="Female",
            phone="+91 94912 34568",
            preferred_language="te",
            address="House 12, Chaaparai Road, Araku Valley",
            habitation="Madagada",
            gram_panchayat="Araku",
            mandal="Araku Valley",
            district="Alluri Sitharama Raju",
            chewing_tobacco=True,
            smoking=False,
            reverse_smoking=True,
            gutkha=False,
            areca_nut=False,
            alcohol=False,
            habits_duration_years=18,
            habits_frequency_per_day="4-5 times/day",
            phc_id=phc_araku.id,
            registered_by_user_id=users[0].id
        )

        # Patient 3: 38-year-old male from Paderu
        patient_subba = Patient(
            patient_id_display="AD-ASR-10494",
            full_name="Subba Rao Killu",
            age=38,
            gender="Male",
            phone="+91 94912 34569",
            preferred_language="te",
            address="Near Weekly Shandy, Paderu",
            habitation="Talari Singi",
            gram_panchayat="Paderu",
            mandal="Paderu",
            district="Alluri Sitharama Raju",
            chewing_tobacco=True,
            smoking=False,
            reverse_smoking=False,
            gutkha=True,
            areca_nut=True,
            alcohol=False,
            habits_duration_years=12,
            habits_frequency_per_day="5-6 gutkha sachets/day",
            phc_id=phc_paderu.id,
            registered_by_user_id=users[0].id
        )
        db.add_all([patient_ramu, patient_kondamma, patient_subba])
        db.flush()

        # Informed Consent
        consent1 = ConsentRecord(
            patient_id=patient_ramu.id,
            consent_type="oral_screening_and_teleconsultation",
            granted=True,
            recorded_by_user_id=users[0].id,
            notes="Telugu informed consent explained and accepted for photographic oral screening, AI assistive triage, teleconsultation, and biopsy pathway."
        )
        consent2 = ConsentRecord(
            patient_id=patient_kondamma.id,
            consent_type="oral_screening_and_teleconsultation",
            granted=True,
            recorded_by_user_id=users[0].id,
            notes="Informed consent verified in Telugu with village elder present."
        )
        db.add_all([consent1, consent2])
        db.flush()

        print("Seeding Screening & Structured AI Triage Output...")
        screening_ramu = Screening(
            reference_id="SCR-ASR-2026-001",
            patient_id=patient_ramu.id,
            phc_id=phc_g_madugula.id,
            category="mouth",
            oral_site=OralSite.BUCCAL_MUCOSA,
            lesion_type=LesionType.LEUKOPLAKIA,
            mouth_opening_mm=32.0,
            burning_sensation=True,
            bleeding=False,
            duration_days=21,
            pain_score=4,
            symptoms="Persistent white patch on inner left cheek (buccal mucosa) with burning sensation on eating spicy food for 3 weeks. Mouth opening slightly restricted (32 mm).",
            severity="moderate",
            status=ScreeningStatus.CONSULTATION_RECOMMENDED,
            created_by_user_id=users[0].id
        )
        db.add(screening_ramu)
        db.flush()

        # Image record for Ramu
        img1 = ScreeningImage(
            screening_id=screening_ramu.id,
            original_filename="oral_left_buccal_ramu.jpg",
            stored_path="uploads/demo_oral_buccal_ramu.jpg",
            file_size_bytes=342000,
            width=1280,
            height=720,
            mime_type="image/jpeg",
            body_site="buccal_mucosa"
        )
        db.add(img1)
        db.flush()

        res1 = ImageProcessingResult(
            image_id=img1.id,
            blur_score=142.8,
            is_blurry=False,
            luminance_score=135.2,
            is_dark=False,
            is_overexposed=False,
            resolution_adequate=True,
            quality_state="acceptable",
            guidance_message="Image quality verified: sharp focus, adequate oral lighting."
        )
        db.add(res1)
        db.flush()

        # Structured nonclinical AI Triage
        ai_triage = AIAnalysis(
            screening_id=screening_ramu.id,
            model_name="IISc-TANUH Inspired Oral Screening Mock Adapter",
            model_version="mock-v1-aarohan2026",
            visual_observations="Well-demarcated homogenous white plaque over left buccal mucosa; no frank ulceration detected. Compatible with oral leukoplakia in chronic tobacco/chutta user.",
            triage_urgency="priority",
            confidence_disclaimer="SIMULATION ONLY — NOT FOR CLINICAL USE. Does not diagnose or stage cancer.",
            recommendations="Urgent specialist clinical review, biopsy recommendation, and tobacco cessation counseling.",
            is_real_inference=False
        )
        db.add(ai_triage)

        # Medical Officer Clinical Review
        mo_review = ClinicalReview(
            screening_id=screening_ramu.id,
            doctor_id=users[1].id,
            review_decision="consultation_booked",
            doctor_agrees_with_ai=True,
            clinical_notes="Examined oral cavity. Confirmed 2.5 x 1.5 cm non-scrapable white patch on left buccal mucosa. Reverse chutta smoking history 22 yrs. High risk of OPMD. Ordered punch/incisional biopsy and arranged specialist teleconsultation with Dr. Priya.",
            action_plan="1. Incisional biopsy ordered. 2. Specialist tele-consultation booked. 3. Feeder ambulance navigator alerted."
        )
        db.add(mo_review)
        db.flush()

        print("Seeding Telemedicine Appointment & OTP Check-in...")
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        apt_ramu = Appointment(
            reference_id="APT-2026-40112",
            patient_id=patient_ramu.id,
            phc_id=phc_g_madugula.id,
            doctor_id=users[2].id,
            screening_id=screening_ramu.id,
            scheduled_date=today_str,
            scheduled_time="11:30",
            expected_arrival_time="11:00",
            appointment_type="telemedicine",
            status=AppointmentStatus.WAITING_FOR_DOCTOR,
            checkin_time=datetime.now(timezone.utc) - timedelta(minutes=15)
        )
        db.add(apt_ramu)
        db.flush()

        # Verified OTP record
        salt = "seedsaltramu"
        otp_ramu = OTPVerification(
            appointment_id=apt_ramu.id,
            patient_id=patient_ramu.id,
            hashed_otp=hash_otp("123456", salt),
            salt=salt,
            attempts=1,
            max_attempts=3,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            resend_available_at=datetime.now(timezone.utc),
            verified=True,
            verified_at=datetime.now(timezone.utc) - timedelta(minutes=15)
        )
        db.add(otp_ramu)

        print("Seeding Module G: Biopsy & Pathology Simulation...")
        biopsy_ramu = Investigation(
            investigation_ref="BIO-2026-0042",
            patient_id=patient_ramu.id,
            screening_id=screening_ramu.id,
            appointment_id=apt_ramu.id,
            kind="incisional_biopsy",
            biopsy_site="Left Buccal Mucosa",
            state=InvestigationState.REPORT_RECEIVED,
            ordered_by_doctor_id=users[1].id,
            specimen_date=datetime.now(timezone.utc) - timedelta(days=2),
            diagnosis_category="precancer_leukoplakia",
            pathology_finding="Hyperkeratosis with moderate epithelial dysplasia (Oral Leukoplakia)",
            histopathology_summary="Microscopic exam of left buccal mucosal punch biopsy: Stratified squamous epithelium displaying pronounced hyperorthokeratosis, acanthosis, bulbous rete ridges, and moderate cellular atypia in lower half of epithelium. Intact basement membrane. Chronic inflammatory infiltrate in lamina propria. Negative for invasive squamous cell carcinoma (OSCC).",
            report_file_url="https://aarogya-storage.itda-paderu.gov.in/reports/BIO-2026-0042.pdf"
        )
        db.add(biopsy_ramu)

        print("Seeding Module F: Hospital Referral & Printable Slip...")
        ref_ramu = Referral(
            referral_slip_number="REF-ASR-58210",
            patient_id=patient_ramu.id,
            originating_phc_id=phc_g_madugula.id,
            specialty_needed="Head & Neck Surgical Oncology",
            urgency="priority",
            target_hospital="District Hospital Paderu / KGH Visakhapatnam",
            reason_for_referral="Pathology-confirmed dysplastic oral leukoplakia (moderate dysplasia) of left buccal mucosa in 46-year-old chronic reverse smoker. Requires specialist surgical oncology evaluation and wide mucosal excision.",
            clinical_notes="Patient is mobile. Vital signs stable. 108 Feeder ambulance coordinated due to remote habitation.",
            status="confirmed",
            scheduled_appointment_date=(datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%d"),
            attendance_confirmed=False,
            created_by_id=users[1].id
        )
        db.add(ref_ramu)

        print("Seeding Module I: Patient Navigation & Feeder Ambulance...")
        nav_task = NavigationTask(
            task_ref="NAV-2026-0101",
            patient_id=patient_ramu.id,
            assigned_navigator_id=users[3].id,
            task_type="biopsy_transport_escort",
            status=NavigationStatus.TRANSPORT_ARRANGED,
            due_date=(datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%d"),
            contact_attempts_count=2,
            last_contact_date=datetime.now(timezone.utc) - timedelta(hours=3),
            transport_support_arranged=True,
            feeder_ambulance_notified=True,
            missed_visit_reason=None,
            notes="Contacted patient via ASHA Sarala. Arranged ITDA Tribal Feeder Ambulance 108 pickup at Vanabhasingi junction on Thursday morning."
        )
        db.add(nav_task)

        # Notification Log
        n_log = NotificationLog(
            recipient_phone=patient_ramu.phone,
            message_type="appointment_scheduled",
            content=f"Aarogya Drishti: Namaskaram Ramu garu, your teleconsultation is scheduled for today at 11:30 AM at G. Madugula PHC.",
            provider="synthetic",
            delivery_status="delivered"
        )
        db.add(n_log)

        db.commit()
        print("Database successfully seeded with complete ITDA Paderu synthetic oral cancer screening dataset!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    reset_arg = "--reset" in sys.argv
    seed_database(reset=reset_arg)
