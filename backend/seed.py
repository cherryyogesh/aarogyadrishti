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
    UserRole, ScreeningCategory, ScreeningStatus, AppointmentStatus
)

def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            print("Database already contains data. Skipping re-seed.")
            return

        print("Seeding PHCs...")
        phc1 = PHC(
            code="PHC-KDK-01",
            name="Kandukur Community Health Centre",
            district="Prakasam",
            state="Andhra Pradesh",
            pin_code="523105",
            contact_number="+91 85982 22100"
        )
        phc2 = PHC(
            code="PHC-PDL-02",
            name="Podili Primary Health Centre",
            district="Prakasam",
            state="Andhra Pradesh",
            pin_code="523240",
            contact_number="+91 85992 44300"
        )
        db.add_all([phc1, phc2])
        db.flush()

        print("Seeding Users across all 5 roles...")
        users = [
            User(
                email="chw@aarogya.gov.in",
                username="chw_sarala",
                hashed_password=get_password_hash("ChwPass@2026"),
                full_name="Sarala Devi (ASHA / CHW)",
                role=UserRole.CHW,
                phc_id=phc1.id,
                phone="+91 98480 11001"
            ),
            User(
                email="mo@aarogya.gov.in",
                username="mo_ramesh",
                hashed_password=get_password_hash("MoPass@2026"),
                full_name="Dr. Ramesh Babu (Medical Officer)",
                role=UserRole.PHC_STAFF,
                phc_id=phc1.id,
                phone="+91 98480 11002"
            ),
            User(
                email="doctor@aarogya.gov.in",
                username="dr_priya",
                hashed_password=get_password_hash("DocPass@2026"),
                full_name="Dr. Priya Sundaram (Dermatology Specialist)",
                role=UserRole.DOCTOR,
                phc_id=phc1.id,
                phone="+91 98480 11003"
            ),
            User(
                email="navigator@aarogya.gov.in",
                username="nav_vijay",
                hashed_password=get_password_hash("NavPass@2026"),
                full_name="Vijay Krishna (Patient Navigator)",
                role=UserRole.NAVIGATOR,
                phc_id=phc1.id,
                phone="+91 98480 11004"
            ),
            User(
                email="admin@aarogya.gov.in",
                username="admin_district",
                hashed_password=get_password_hash("AdminPass@2026"),
                full_name="District Administrator (DMHO)",
                role=UserRole.ADMIN,
                phc_id=None,
                phone="+91 98480 11005"
            ),
        ]
        db.add_all(users)
        db.flush()

        print("Seeding Patients & Consent records...")
        patient1 = Patient(
            patient_id_display="AD-10021",
            full_name="Lakshmi Devi",
            age=48,
            gender="Female",
            phone="+91 98481 23456",
            preferred_language="te",
            address="Door No 4-12, Main Bazaar",
            village_town="Kandukur",
            phc_id=phc1.id,
            registered_by_user_id=users[0].id
        )
        patient2 = Patient(
            patient_id_display="AD-10022",
            full_name="Venkat Rao",
            age=62,
            gender="Male",
            phone="+91 98482 34567",
            preferred_language="te",
            address="Plot 15, Near Water Tank",
            village_town="Podili",
            phc_id=phc1.id,
            registered_by_user_id=users[0].id
        )
        patient3 = Patient(
            patient_id_display="AD-10023",
            full_name="Rajesh Kumar",
            age=35,
            gender="Male",
            phone="+91 98483 45678",
            preferred_language="hi",
            address="Street 2, Industrial Colony",
            village_town="Kandukur",
            phc_id=phc1.id,
            registered_by_user_id=users[0].id
        )
        db.add_all([patient1, patient2, patient3])
        db.flush()

        # Add consent records
        consent1 = ConsentRecord(
            patient_id=patient1.id,
            consent_type="visible_screening_telemedicine",
            granted=True,
            recorded_by_user_id=users[0].id,
            notes="Signed paper form and verified via oral consent in Telugu."
        )
        consent2 = ConsentRecord(
            patient_id=patient2.id,
            consent_type="visible_screening_telemedicine",
            granted=True,
            recorded_by_user_id=users[0].id,
            notes="Informed consent recorded with family member present."
        )
        db.add_all([consent1, consent2])
        db.flush()

        print("Seeding Screenings & AI Analysis records...")
        scr1 = Screening(
            reference_id="SCR-2026-10492",
            patient_id=patient1.id,
            phc_id=phc1.id,
            category=ScreeningCategory.SKIN,
            symptoms="Red itchy rash on forearm for 5 days. Mild burning sensation in sunlight.",
            duration_days=5,
            severity="moderate",
            status=ScreeningStatus.CONSULTATION_RECOMMENDED,
            created_by_user_id=users[0].id
        )
        scr2 = Screening(
            reference_id="SCR-2026-10493",
            patient_id=patient2.id,
            phc_id=phc1.id,
            category=ScreeningCategory.MOUTH,
            symptoms="White patch inside left cheek (buccal mucosa). Smoker for 20 years. No acute pain.",
            duration_days=21,
            severity="moderate",
            status=ScreeningStatus.UNDER_PHC_REVIEW,
            created_by_user_id=users[0].id
        )
        db.add_all([scr1, scr2])
        db.flush()

        # AI analysis for scr1
        ai1 = AIAnalysis(
            screening_id=scr1.id,
            model_name="Clinical Safety & Triage Engine",
            model_version="2026.1",
            visual_observations="Observed erythematous maculopapular rash on volar forearm.",
            triage_urgency="routine",
            confidence_disclaimer="Non-diagnostic preliminary triage guidance.",
            recommendations="Avoid scratching. Keep dry. Scheduled for tele-dermatology consultation.",
            is_real_inference=False
        )
        # AI analysis for scr2
        ai2 = AIAnalysis(
            screening_id=scr2.id,
            model_name="Clinical Safety & Triage Engine",
            model_version="2026.1",
            visual_observations="Observed visible leukoplakia-like pale mucosal area on buccal surface.",
            triage_urgency="priority",
            confidence_disclaimer="Non-diagnostic triage guidance. Oral lesion requires biopsy/specialist exam.",
            recommendations="Priority specialist dental/oral examination recommended. Discontinue tobacco use immediately.",
            is_real_inference=False
        )
        db.add_all([ai1, ai2])

        # Clinical review for scr1
        rev1 = ClinicalReview(
            screening_id=scr1.id,
            reviewer_id=users[1].id,
            review_decision="consultation_booked",
            clinical_notes="Erythema present. Telemedicine consultation with dermatologist arranged.",
            action_plan="Booked tele-consultation with Dr. Priya."
        )
        db.add(rev1)
        db.flush()

        print("Seeding Appointments & OTP Check-in state...")
        # Today's date
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Appointment 1: Checked in and waiting in doctor queue!
        apt1 = Appointment(
            reference_id="APT-2026-40112",
            patient_id=patient1.id,
            phc_id=phc1.id,
            doctor_id=users[2].id,
            screening_id=scr1.id,
            scheduled_date=today_str,
            scheduled_time="11:00",
            expected_arrival_time="10:30",
            appointment_type="telemedicine",
            status=AppointmentStatus.WAITING_FOR_DOCTOR,
            checkin_time=datetime.now(timezone.utc) - timedelta(minutes=14)
        )
        # Appointment 2: Scheduled for later today
        apt2 = Appointment(
            reference_id="APT-2026-40113",
            patient_id=patient2.id,
            phc_id=phc1.id,
            doctor_id=users[2].id,
            screening_id=scr2.id,
            scheduled_date=today_str,
            scheduled_time="12:30",
            expected_arrival_time="12:00",
            appointment_type="telemedicine",
            status=AppointmentStatus.SCHEDULED
        )
        db.add_all([apt1, apt2])
        db.flush()

        # OTP record for apt1 (Verified)
        salt1 = "seedsalt1"
        otp1 = OTPVerification(
            appointment_id=apt1.id,
            patient_id=patient1.id,
            hashed_otp=hash_otp("123456", salt1),
            salt=salt1,
            attempts=1,
            max_attempts=3,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
            resend_available_at=datetime.now(timezone.utc),
            verified=True,
            verified_at=datetime.now(timezone.utc) - timedelta(minutes=14)
        )
        db.add(otp1)

        # Appointment Events
        ev1 = AppointmentEvent(
            appointment_id=apt1.id,
            previous_status="scheduled",
            new_status="waiting_for_doctor",
            changed_by_user_id=users[1].id,
            reason="Patient arrived and verified via OTP."
        )
        db.add(ev1)

        # Notification Logs
        n1 = NotificationLog(
            recipient_phone=patient1.phone,
            message_type="appointment_scheduled",
            content=f"Aarogya Drishti: Your appointment is scheduled for {today_str} at 11:00 at {phc1.name}.",
            provider="synthetic",
            delivery_status="delivered"
        )
        db.add(n1)

        db.commit()
        print("Database successfully seeded with realistic synthetic healthcare data!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
