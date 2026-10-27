import random
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import mask_phone_number
from app.models.entities import Patient, ConsentRecord, PHC, User, UserRole, AuditEvent
from app.schemas.all_schemas import PatientCreate, PatientResponse
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/patients", tags=["Patients"])

def generate_patient_display_id(db: Session) -> str:
    while True:
        num = random.randint(10000, 99999)
        pid = f"AD-{num}"
        existing = db.query(Patient).filter(Patient.patient_id_display == pid).first()
        if not existing:
            return pid

@router.get("/search", response_model=List[PatientResponse])
def search_patients(
    q: Optional[str] = Query(None, description="Search term for ID, name, or phone"),
    phc_id: Optional[int] = Query(None),
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Patient)

    # Restrict CHW / PHC staff to their assigned PHC if configured
    if current_user.role in [UserRole.CHW, UserRole.PHC_STAFF] and current_user.phc_id:
        query = query.filter(Patient.phc_id == current_user.phc_id)
    elif phc_id:
        query = query.filter(Patient.phc_id == phc_id)

    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            (Patient.patient_id_display.ilike(term)) |
            (Patient.full_name.ilike(term)) |
            (Patient.phone.like(term))
        )

    patients = query.order_by(Patient.created_at.desc()).limit(limit).all()

    results = []
    for p in patients:
        results.append(PatientResponse(
            id=p.id,
            patient_id_display=p.patient_id_display,
            full_name=p.full_name,
            age=p.age,
            gender=p.gender,
            phone_masked=mask_phone_number(p.phone),
            preferred_language=p.preferred_language,
            habitation=p.habitation,
            gram_panchayat=p.gram_panchayat,
            mandal=p.mandal,
            district=p.district,
            chewing_tobacco=bool(p.chewing_tobacco),
            smoking=bool(p.smoking),
            reverse_smoking=bool(p.reverse_smoking),
            habits_duration_years=p.habits_duration_years or 0,
            phc_id=p.phc_id,
            phc_name=p.phc.name if p.phc else None,
            created_at=p.created_at
        ))
    return results

@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def register_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.CHW, UserRole.PHC_STAFF, UserRole.ADMIN]))
):
    # Verify PHC exists
    phc = db.query(PHC).filter(PHC.id == payload.phc_id).first()
    if not phc:
        raise HTTPException(status_code=400, detail="Invalid PHC selected.")

    # Generate unique display ID
    display_id = generate_patient_display_id(db)

    patient = Patient(
        patient_id_display=display_id,
        full_name=payload.full_name.strip(),
        age=payload.age,
        gender=payload.gender.strip(),
        phone=payload.phone.strip(),
        preferred_language=payload.preferred_language,
        address=payload.address,
        habitation=payload.habitation,
        gram_panchayat=payload.gram_panchayat,
        mandal=payload.mandal,
        district=payload.district,
        chewing_tobacco=payload.chewing_tobacco,
        smoking=payload.smoking,
        reverse_smoking=payload.reverse_smoking,
        gutkha=payload.gutkha,
        areca_nut=payload.areca_nut,
        alcohol=payload.alcohol,
        habits_duration_years=payload.habits_duration_years,
        habits_frequency_per_day=payload.habits_frequency_per_day,
        phc_id=payload.phc_id,
        registered_by_user_id=current_user.id
    )
    db.add(patient)
    db.flush()

    # Record consent
    consent = ConsentRecord(
        patient_id=patient.id,
        consent_type="visible_screening_telemedicine",
        granted=payload.consent_granted,
        recorded_by_user_id=current_user.id,
        notes=payload.consent_notes or "Informed consent recorded at registration."
    )
    db.add(consent)

    # Audit event
    audit = AuditEvent(
        user_id=current_user.id,
        action="REGISTER_PATIENT",
        entity_type="Patient",
        entity_id=display_id,
        details=f"Registered patient {patient.full_name} under PHC {phc.name}."
    )
    db.add(audit)
    db.commit()
    db.refresh(patient)

    return PatientResponse(
        id=patient.id,
        patient_id_display=patient.patient_id_display,
        full_name=patient.full_name,
        age=patient.age,
        gender=patient.gender,
        phone_masked=mask_phone_number(patient.phone),
        preferred_language=patient.preferred_language,
        habitation=patient.habitation,
        gram_panchayat=patient.gram_panchayat,
        mandal=patient.mandal,
        district=patient.district,
        chewing_tobacco=bool(patient.chewing_tobacco),
        smoking=bool(patient.smoking),
        reverse_smoking=bool(patient.reverse_smoking),
        habits_duration_years=patient.habits_duration_years or 0,
        phc_id=patient.phc_id,
        phc_name=phc.name,
        created_at=patient.created_at
    )

@router.get("/{id}")
def get_patient_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # Object-level check: CHW only accesses patients from their PHC
    if current_user.role == UserRole.CHW and current_user.phc_id and patient.phc_id != current_user.phc_id:
        raise HTTPException(status_code=403, detail="Access denied to patient records outside your assigned PHC.")

    screenings_data = []
    for s in patient.screenings:
        screenings_data.append({
            "id": s.id,
            "reference_id": s.reference_id,
            "category": s.category,
            "oral_site": s.oral_site.value if s.oral_site else None,
            "lesion_type": s.lesion_type.value if s.lesion_type else None,
            "symptoms": s.symptoms,
            "severity": s.severity,
            "status": s.status.value,
            "created_at": s.created_at.isoformat()
        })

    appointments_data = []
    for a in patient.appointments:
        appointments_data.append({
            "id": a.id,
            "reference_id": a.reference_id,
            "scheduled_date": a.scheduled_date,
            "scheduled_time": a.scheduled_time,
            "expected_arrival_time": a.expected_arrival_time,
            "status": a.status.value,
            "doctor_name": a.doctor.full_name if a.doctor else None
        })

    consents_data = []
    for c in patient.consent_records:
        consents_data.append({
            "id": c.id,
            "consent_type": c.consent_type,
            "granted": c.granted,
            "notes": c.notes,
            "timestamp": c.timestamp.isoformat()
        })

    return {
        "id": patient.id,
        "patient_id_display": patient.patient_id_display,
        "full_name": patient.full_name,
        "age": patient.age,
        "gender": patient.gender,
        "phone_masked": mask_phone_number(patient.phone),
        "preferred_language": patient.preferred_language,
        "address": patient.address,
        "habitation": patient.habitation,
        "gram_panchayat": patient.gram_panchayat,
        "mandal": patient.mandal,
        "district": patient.district,
        "chewing_tobacco": patient.chewing_tobacco,
        "smoking": patient.smoking,
        "reverse_smoking": patient.reverse_smoking,
        "habits_duration_years": patient.habits_duration_years,
        "phc_id": patient.phc_id,
        "phc_name": patient.phc.name if patient.phc else None,
        "created_at": patient.created_at.isoformat(),
        "consents": consents_data,
        "screenings": screenings_data,
        "appointments": appointments_data
    }
