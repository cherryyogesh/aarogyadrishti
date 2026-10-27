from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.entities import (
    Screening, Appointment, AppointmentStatus, NotificationLog, Referral,
    Patient, Investigation, InvestigationState, User, UserRole
)
from app.schemas.all_schemas import DistrictAnalyticsResponse
from app.integrations.ai.hf_client import hf_client
from app.api.deps import require_roles

router = APIRouter(prefix="/reports", tags=["District Reports & Analytics"])

@router.get("/district-analytics", response_model=DistrictAnalyticsResponse)
def get_district_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.DOCTOR, UserRole.PHC_STAFF]))
):
    total_screenings = db.query(Screening).count()

    # Screenings by category
    category_counts = {}
    rows = db.query(Screening.category, func.count(Screening.id)).group_by(Screening.category).all()
    for cat, count in rows:
        key = cat.value if hasattr(cat, 'value') else str(cat)
        category_counts[key] = count

    # Screenings by mandal (ITDA Paderu Agency)
    mandal_counts = {
        "G. Madugula": 0,
        "Paderu": 0,
        "Araku Valley": 0,
        "Chintapalli": 0,
        "Dumbriguda": 0,
        "Ananthagiri": 0
    }
    mandal_rows = db.query(Patient.mandal, func.count(Screening.id))\
        .join(Screening, Screening.patient_id == Patient.id)\
        .group_by(Patient.mandal).all()
    for mandal, count in mandal_rows:
        if mandal:
            mandal_counts[mandal] = count

    # Precancer and Malignancy tracking
    precancers = db.query(Investigation).filter(
        Investigation.diagnosis_category.in_(["precancer_leukoplakia", "osmf"])
    ).count()

    cancers = db.query(Investigation).filter(
        Investigation.diagnosis_category == "oscc_malignancy"
    ).count()

    # Biopsies pending vs completed
    biopsies_pending = db.query(Investigation).filter(
        Investigation.state.in_([
            InvestigationState.ADVISED,
            InvestigationState.SCHEDULED,
            InvestigationState.SAMPLE_COLLECTED,
            InvestigationState.REPORT_PENDING
        ])
    ).count()

    biopsies_completed = db.query(Investigation).filter(
        Investigation.state.in_([
            InvestigationState.REPORT_RECEIVED,
            InvestigationState.CLINICIAN_REVIEWED
        ])
    ).count()

    # Cases awaiting review
    awaiting_review = db.query(Screening).filter(
        Screening.status.in_(["submitted", "under_phc_review", "quality_review"])
    ).count()

    # Appointments
    total_appointments = db.query(Appointment).count()
    verified_arrivals = db.query(Appointment).filter(
        Appointment.status.in_([
            AppointmentStatus.WAITING_FOR_DOCTOR,
            AppointmentStatus.IN_CONSULTATION,
            AppointmentStatus.COMPLETED
        ])
    ).count()

    # Calculate average wait duration from actual checked-in appointments
    checked_in_apts = db.query(Appointment).filter(
        Appointment.checkin_time.isnot(None)
    ).all()

    now = datetime.now(timezone.utc)
    wait_times = []
    for a in checked_in_apts:
        chk = a.checkin_time
        if chk:
            if chk.tzinfo is None:
                chk = chk.replace(tzinfo=timezone.utc)
            end_time = a.consultation_start_time or now
            if end_time.tzinfo is None:
                end_time = end_time.replace(tzinfo=timezone.utc)
            duration_mins = max(0, (end_time - chk).total_seconds() / 60.0)
            wait_times.append(duration_mins)

    avg_wait = round(sum(wait_times) / len(wait_times), 1) if wait_times else 0.0

    # Referrals
    referrals_count = db.query(Referral).count()

    # SMS delivery rate
    total_sms = db.query(NotificationLog).count()
    delivered_sms = db.query(NotificationLog).filter(
        NotificationLog.delivery_status.in_(["sent", "delivered"])
    ).count()
    sms_rate = round((delivered_sms / total_sms) * 100.0, 1) if total_sms > 0 else 100.0

    ai_status = "Hugging Face Inference Active" if hf_client.is_configured() else "Clinical Safety Engine Active (HF Unconfigured)"

    return DistrictAnalyticsResponse(
        total_screenings=total_screenings,
        screenings_by_category=category_counts,
        screenings_by_mandal=mandal_counts,
        precancers_detected=precancers,
        cancers_confirmed=cancers,
        cases_awaiting_review=awaiting_review,
        biopsies_pending=biopsies_pending,
        biopsies_completed=biopsies_completed,
        total_appointments_booked=total_appointments,
        verified_arrivals_count=verified_arrivals,
        average_wait_duration_minutes=avg_wait,
        referrals_count=referrals_count,
        sms_delivery_rate_percent=sms_rate,
        ai_service_status=ai_status
    )
