import sys
import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend directory is in python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash, hash_otp
from app.models.entities import (
    User, PHC, Patient, ConsentRecord, Screening, ScreeningImage,
    ImageProcessingResult, AIAnalysis, ClinicalReview, Appointment,
    AppointmentEvent, OTPVerification, NotificationLog, Consultation,
    UserRole, ScreeningCategory, ScreeningStatus, AppointmentStatus
)
from datetime import datetime, timedelta, timezone

TEST_DB_PATH = backend_dir / "test_aarogya.db"
TEST_SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

test_engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def seed_test_data(db):
    phc1 = PHC(code="PHC-TEST-01", name="Kandukur Test PHC", district="Prakasam", state="AP")
    db.add(phc1)
    db.flush()

    users = [
        User(
            email="chw@aarogya.gov.in",
            username="chw_sarala",
            hashed_password=get_password_hash("ChwPass@2026"),
            full_name="Sarala Devi (CHW)",
            role=UserRole.CHW,
            phc_id=phc1.id,
            phone="+91 98480 11001"
        ),
        User(
            email="mo@aarogya.gov.in",
            username="mo_ramesh",
            hashed_password=get_password_hash("MoPass@2026"),
            full_name="Dr. Ramesh Babu (MO)",
            role=UserRole.PHC_STAFF,
            phc_id=phc1.id,
            phone="+91 98480 11002"
        ),
        User(
            email="doctor@aarogya.gov.in",
            username="dr_priya",
            hashed_password=get_password_hash("DocPass@2026"),
            full_name="Dr. Priya (Doctor)",
            role=UserRole.DOCTOR,
            phc_id=phc1.id,
            phone="+91 98480 11003"
        ),
        User(
            email="admin@aarogya.gov.in",
            username="admin_district",
            hashed_password=get_password_hash("AdminPass@2026"),
            full_name="District Admin",
            role=UserRole.ADMIN,
            phc_id=None,
            phone="+91 98480 11005"
        )
    ]
    db.add_all(users)
    db.flush()

    patient1 = Patient(
        patient_id_display="AD-10021",
        full_name="Lakshmi Devi",
        age=48,
        gender="Female",
        phone="+91 98481 23456",
        preferred_language="te",
        phc_id=phc1.id
    )
    patient2 = Patient(
        patient_id_display="AD-10022",
        full_name="Venkat Rao",
        age=62,
        gender="Male",
        phone="+91 98482 34567",
        preferred_language="te",
        phc_id=phc1.id
    )
    patient3 = Patient(
        patient_id_display="AD-10023",
        full_name="Rajesh Kumar",
        age=35,
        gender="Male",
        phone="+91 98483 45678",
        preferred_language="hi",
        phc_id=phc1.id
    )
    db.add_all([patient1, patient2, patient3])
    db.flush()

    # Appointment 1: waiting for doctor
    apt1 = Appointment(
        reference_id="APT-TEST-001",
        patient_id=patient1.id,
        phc_id=phc1.id,
        doctor_id=users[2].id,
        scheduled_date="2026-11-01",
        scheduled_time="11:00",
        expected_arrival_time="10:30",
        status=AppointmentStatus.WAITING_FOR_DOCTOR,
        checkin_time=datetime.now(timezone.utc) - timedelta(minutes=10)
    )
    # Appointment 2: scheduled (ready for OTP checkin)
    apt2 = Appointment(
        reference_id="APT-TEST-002",
        patient_id=patient2.id,
        phc_id=phc1.id,
        doctor_id=users[2].id,
        scheduled_date="2026-11-01",
        scheduled_time="12:00",
        expected_arrival_time="11:30",
        status=AppointmentStatus.SCHEDULED
    )
    db.add_all([apt1, apt2])
    db.commit()

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_test_data(db)
    db.close()

    def override_get_db():
        test_db = TestingSessionLocal()
        try:
            yield test_db
        finally:
            test_db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture(scope="session")
def chw_token(client):
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "chw@aarogya.gov.in",
        "password": "ChwPass@2026"
    })
    return resp.json()["access_token"]

@pytest.fixture(scope="session")
def doctor_token(client):
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "doctor@aarogya.gov.in",
        "password": "DocPass@2026"
    })
    return resp.json()["access_token"]

@pytest.fixture(scope="session")
def admin_token(client):
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin@aarogya.gov.in",
        "password": "AdminPass@2026"
    })
    return resp.json()["access_token"]
