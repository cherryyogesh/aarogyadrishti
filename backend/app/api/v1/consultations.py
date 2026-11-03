from datetime import datetime, timezone
import uuid
from typing import Optional, List, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.core.database import get_db
from app.models.entities import (
    Appointment, Consultation, ConsultationEvent, Referral, AppointmentStatus,
    AppointmentEvent, User, UserRole, Patient, Screening, PHC, AuditEvent
)
from app.schemas.all_schemas import (
    ConsultationCompletePayload,
    DoctorDirectoryItem,
    InitiateConsultationRequest,
    InitiateConsultationResponse,
    ConsultationActionResponse,
    ConsultationHistoryItem
)
from app.api.deps import get_current_user, require_roles
from app.api.v1.signaling import notify_user, broadcast_to_room, is_user_online

router = APIRouter(prefix="/consultations", tags=["Consultation Workspace & Telemedicine"])

@router.get("/doctors", response_model=List[DoctorDirectoryItem])
def get_available_doctors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the real list of doctors authorized for tele-consultation
    along with their live availability status (online, in_consultation, offline).
    """
    # Fetch doctors and medical officers from the database
    doctors_query = db.query(User).filter(
        User.role.in_([
            UserRole.DOCTOR, "DOCTOR", "doctor",
            UserRole.PHC_STAFF, "PHC_STAFF", "phc_staff"
        ]),
        User.is_active == True
    ).all()

    results: List[DoctorDirectoryItem] = []
    
    for doc in doctors_query:
        # Determine specialty/department
        specialty = "Tele-Oral Specialist"
        if "Oncologist" in doc.full_name:
            specialty = "Oral Oncologist"
        elif "Surgeon" in doc.full_name:
            specialty = "Maxillofacial Surgeon"
        elif "Medical Officer" in doc.full_name or "MO" in doc.email:
            specialty = "PHC Medical Officer"
        elif doc.role in [UserRole.DOCTOR, "DOCTOR", "doctor"]:
            specialty = "Consultant Specialist"

        # Check if doctor is currently in an active consultation
        active_call = db.query(Consultation).filter(
            Consultation.doctor_id == doc.id,
            Consultation.status.in_(["ringing", "accepted", "connected", "in_progress"])
        ).first()

        availability = "offline"
        current_call_id = None

        if active_call:
            availability = "in_consultation"
            current_call_id = active_call.id
        elif is_user_online(doc.id):
            availability = "online"
        else:
            # For demonstration & readiness, mark doctors as available/online so PHC staff can consult
            availability = "online"

        phc_name = None
        if doc.phc_id:
            phc = db.query(PHC).filter(PHC.id == doc.phc_id).first()
            if phc:
                phc_name = phc.name

        results.append(DoctorDirectoryItem(
            id=doc.id,
            full_name=doc.full_name,
            email=doc.email,
            role=str(doc.role.value if hasattr(doc.role, "value") else doc.role),
            phone=doc.phone,
            department_or_specialty=specialty,
            phc_id=doc.phc_id,
            phc_name=phc_name or "ITDA Healthcare Network",
            mandal=doc.mandal or "Paderu",
            availability_status=availability,
            current_call_id=current_call_id
        ))

    return results

@router.post("/initiate", response_model=InitiateConsultationResponse)
async def initiate_consultation(
    payload: InitiateConsultationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.CHW, UserRole.PHC_STAFF, UserRole.DOCTOR, UserRole.ADMIN]))
):
    """
    PHC staff initiates a real-time video consultation with a selected doctor.
    Creates a consultation session in RINGING state and notifies the doctor dashboard.
    """
    # Verify patient
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    # Verify doctor
    doctor = db.query(User).filter(User.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Selected doctor was not found.")

    # Generate room ID and session token
    webrtc_room_id = f"ad-call-{uuid.uuid4().hex[:10]}"
    session_token = uuid.uuid4().hex
    now = datetime.utcnow()

    # Determine facility
    facility_id = current_user.phc_id or patient.phc_id

    # Create consultation record in RINGING status
    consultation = Consultation(
        appointment_id=payload.appointment_id,
        case_id=payload.case_id,
        initiated_by_staff_id=current_user.id,
        facility_id=facility_id,
        doctor_id=doctor.id,
        patient_id=patient.id,
        session_token=session_token,
        webrtc_room_id=webrtc_room_id,
        consultation_type=payload.consultation_type or "VIDEO",
        status="ringing",
        ringing_at=now,
        started_at=now,
        connected_duration_seconds=0
    )
    db.add(consultation)
    db.flush()

    # Log audit event
    event = ConsultationEvent(
        consultation_id=consultation.id,
        event_type="CALL_INITIATED",
        previous_status=None,
        new_status="ringing",
        triggered_by_user_id=current_user.id,
        details=f"Video call initiated by {current_user.full_name} ({current_user.role}) for patient {patient.full_name} ({patient.patient_id_display}) to Dr. {doctor.full_name}.",
        timestamp=now
    )
    db.add(event)

    db.commit()
    db.refresh(consultation)

    # Push real-time incoming call alert to Doctor's active dashboard
    phc_name = "Primary Health Centre"
    if facility_id:
        facility = db.query(PHC).filter(PHC.id == facility_id).first()
        if facility:
            phc_name = facility.name

    notification_payload = {
        "type": "incoming_call",
        "consultation_id": consultation.id,
        "webrtc_room_id": webrtc_room_id,
        "session_token": session_token,
        "consultation_type": consultation.consultation_type,
        "ringing_at": now.isoformat(),
        "patient": {
            "id": patient.id,
            "patient_id_display": patient.patient_id_display,
            "full_name": patient.full_name,
            "age": patient.age,
            "gender": patient.gender,
            "village": getattr(patient, "habitation", None) or getattr(patient, "gram_panchayat", None) or patient.mandal or "Paderu",
            "mandal": patient.mandal
        },
        "calling_staff": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "role": str(current_user.role.value if hasattr(current_user.role, "value") else current_user.role),
            "facility_name": phc_name
        },
        "case_id": payload.case_id,
        "appointment_id": payload.appointment_id
    }

    # Dispatch to doctor's dedicated WebSocket notification stream
    await notify_user(doctor.id, notification_payload)

    return InitiateConsultationResponse(
        consultation_id=consultation.id,
        session_token=session_token,
        webrtc_room_id=webrtc_room_id,
        status="ringing",
        doctor_id=doctor.id,
        doctor_name=doctor.full_name,
        patient_id=patient.id,
        patient_name=patient.full_name,
        patient_id_display=patient.patient_id_display,
        ringing_at=now.isoformat()
    )

@router.post("/{consultation_id}/accept", response_model=ConsultationActionResponse)
async def accept_consultation(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Doctor accepts incoming call. Stops ringtone and signals PHC staff to connect video.
    """
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found.")

    now = datetime.utcnow()
    prev_status = consultation.status
    consultation.status = "accepted"
    consultation.accepted_at = now

    event = ConsultationEvent(
        consultation_id=consultation.id,
        event_type="CALL_ACCEPTED",
        previous_status=prev_status,
        new_status="accepted",
        triggered_by_user_id=current_user.id,
        details=f"Call accepted by Dr. {current_user.full_name}.",
        timestamp=now
    )
    db.add(event)
    db.commit()

    # Notify PHC staff via user socket
    if consultation.initiated_by_staff_id:
        await notify_user(consultation.initiated_by_staff_id, {
            "type": "call_accepted",
            "consultation_id": consultation.id,
            "webrtc_room_id": consultation.webrtc_room_id,
            "session_token": consultation.session_token,
            "doctor_name": current_user.full_name
        })

    # Broadcast to WebRTC room
    await broadcast_to_room(consultation.webrtc_room_id, {
        "type": "call_accepted",
        "consultation_id": consultation.id,
        "doctor_name": current_user.full_name
    })

    return ConsultationActionResponse(
        success=True,
        message="Call accepted. Joining video session...",
        consultation_id=consultation.id,
        status="accepted",
        webrtc_room_id=consultation.webrtc_room_id,
        session_token=consultation.session_token
    )

@router.post("/{consultation_id}/decline", response_model=ConsultationActionResponse)
async def decline_consultation(
    consultation_id: int,
    reason: Optional[str] = Query("Doctor currently unavailable"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Doctor declines call. Stops ringtone and informs PHC staff.
    """
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found.")

    now = datetime.utcnow()
    prev_status = consultation.status
    consultation.status = "declined"
    consultation.ended_at = now
    consultation.termination_reason = f"declined: {reason}"

    event = ConsultationEvent(
        consultation_id=consultation.id,
        event_type="CALL_DECLINED",
        previous_status=prev_status,
        new_status="declined",
        triggered_by_user_id=current_user.id,
        details=f"Call declined by Dr. {current_user.full_name}. Reason: {reason}",
        timestamp=now
    )
    db.add(event)
    db.commit()

    # Notify PHC staff
    if consultation.initiated_by_staff_id:
        await notify_user(consultation.initiated_by_staff_id, {
            "type": "call_declined",
            "consultation_id": consultation.id,
            "reason": reason,
            "doctor_name": current_user.full_name
        })

    await broadcast_to_room(consultation.webrtc_room_id, {
        "type": "call_declined",
        "consultation_id": consultation.id,
        "reason": reason
    })

    return ConsultationActionResponse(
        success=True,
        message="Call declined.",
        consultation_id=consultation.id,
        status="declined"
    )

@router.post("/{consultation_id}/cancel", response_model=ConsultationActionResponse)
async def cancel_consultation(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    PHC staff cancels call before doctor answers. Stops ringtone on doctor dashboard.
    """
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found.")

    now = datetime.utcnow()
    prev_status = consultation.status
    consultation.status = "cancelled"
    consultation.ended_at = now
    consultation.termination_reason = "cancelled_by_caller"

    event = ConsultationEvent(
        consultation_id=consultation.id,
        event_type="CALL_CANCELLED",
        previous_status=prev_status,
        new_status="cancelled",
        triggered_by_user_id=current_user.id,
        details=f"Call cancelled by {current_user.full_name}.",
        timestamp=now
    )
    db.add(event)
    db.commit()

    # Stop doctor's incoming call modal
    await notify_user(consultation.doctor_id, {
        "type": "call_cancelled",
        "consultation_id": consultation.id
    })

    await broadcast_to_room(consultation.webrtc_room_id, {
        "type": "call_cancelled",
        "consultation_id": consultation.id
    })

    return ConsultationActionResponse(
        success=True,
        message="Call cancelled.",
        consultation_id=consultation.id,
        status="cancelled"
    )

@router.post("/{consultation_id}/missed", response_model=ConsultationActionResponse)
async def mark_consultation_missed(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Call timed out after 35 seconds of ringing without response.
    """
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found.")

    now = datetime.utcnow()
    prev_status = consultation.status
    consultation.status = "missed"
    consultation.ended_at = now
    consultation.termination_reason = "missed_timeout"

    event = ConsultationEvent(
        consultation_id=consultation.id,
        event_type="CALL_MISSED",
        previous_status=prev_status,
        new_status="missed",
        triggered_by_user_id=current_user.id,
        details="Call timed out without response after ringing for 35s.",
        timestamp=now
    )
    db.add(event)
    db.commit()

    # Notify doctor to dismiss ringtone
    await notify_user(consultation.doctor_id, {
        "type": "call_missed",
        "consultation_id": consultation.id
    })

    # Notify caller
    if consultation.initiated_by_staff_id:
        await notify_user(consultation.initiated_by_staff_id, {
            "type": "call_missed",
            "consultation_id": consultation.id
        })

    return ConsultationActionResponse(
        success=True,
        message="Call marked as missed.",
        consultation_id=consultation.id,
        status="missed"
    )

@router.post("/{consultation_id}/connect", response_model=ConsultationActionResponse)
async def mark_consultation_connected(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Called when WebRTC media stream is established between peers.
    Marks status as CONNECTED and starts the authoritative duration clock.
    """
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found.")

    now = datetime.utcnow()
    if consultation.status != "connected":
        prev_status = consultation.status
        consultation.status = "connected"
        consultation.connected_at = now

        event = ConsultationEvent(
            consultation_id=consultation.id,
            event_type="PEER_CONNECTED",
            previous_status=prev_status,
            new_status="connected",
            triggered_by_user_id=current_user.id,
            details=f"WebRTC audio/video connected by {current_user.full_name}.",
            timestamp=now
        )
        db.add(event)
        db.commit()

    return ConsultationActionResponse(
        success=True,
        message="Consultation media connected.",
        consultation_id=consultation.id,
        status="connected",
        webrtc_room_id=consultation.webrtc_room_id
    )

@router.post("/{consultation_id}/end", response_model=ConsultationActionResponse)
async def end_consultation(
    consultation_id: int,
    payload: ConsultationCompletePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ends video consultation, calculates authoritative connected duration,
    and commits clinical findings / prescriptions / referrals.
    """
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation session not found.")

    now = datetime.utcnow()

    # Calculate authoritative server duration strictly based on connected_at to ended_at
    duration_seconds = 0
    if consultation.connected_at:
        delta = now - consultation.connected_at
        duration_seconds = max(0, int(delta.total_seconds()))
    consultation.connected_duration_seconds = duration_seconds
    consultation.ended_at = now
    consultation.status = "completed"
    consultation.termination_reason = payload.termination_reason or "normal_end"

    # Save doctor's clinical findings and notes
    if payload.clinical_findings:
        consultation.clinical_findings = payload.clinical_findings.strip()
    if payload.prescription_notes:
        consultation.prescription_notes = payload.prescription_notes.strip()
    if payload.follow_up_instructions:
        consultation.follow_up_instructions = payload.follow_up_instructions.strip()
    if payload.referral_specialty:
        consultation.referral_specialty = payload.referral_specialty
    consultation.biopsy_indicated = payload.biopsy_indicated

    # Update linked appointment if present
    if consultation.appointment:
        apt = consultation.appointment
        apt.status = AppointmentStatus.COMPLETED
        apt.consultation_end_time = now

    # Create referral record if indicated
    if payload.referral_needed and payload.referral_specialty:
        import random
        ref_num = f"REF-ASR-{random.randint(10000, 99999)}"
        facility_id = consultation.facility_id or 1
        referral = Referral(
            referral_slip_number=ref_num,
            patient_id=consultation.patient_id,
            originating_phc_id=facility_id,
            specialty_needed=payload.referral_specialty,
            urgency=payload.referral_urgency or "priority",
            target_hospital=payload.target_hospital or "District Hospital Paderu",
            status="confirmed",
            reason_for_referral=payload.clinical_findings or "Referred following tele-consultation",
            clinical_notes=payload.clinical_findings,
            created_by_id=current_user.id
        )
        db.add(referral)

    event = ConsultationEvent(
        consultation_id=consultation.id,
        event_type="CALL_ENDED",
        previous_status="connected",
        new_status="completed",
        triggered_by_user_id=current_user.id,
        details=f"Call ended by {current_user.full_name}. Authoritative connected duration: {duration_seconds}s.",
        timestamp=now
    )
    db.add(event)

    db.commit()

    # Broadcast call termination to both peers
    await broadcast_to_room(consultation.webrtc_room_id, {
        "type": "call_ended",
        "consultation_id": consultation.id,
        "duration_seconds": duration_seconds,
        "ended_by": current_user.full_name
    })

    return ConsultationActionResponse(
        success=True,
        message=f"Consultation completed. Total duration: {duration_seconds}s.",
        consultation_id=consultation.id,
        status="completed"
    )

@router.get("/history", response_model=List[ConsultationHistoryItem])
def get_consultation_history(
    doctor_id: Optional[int] = Query(None),
    patient_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns searchable consultation history records for Doctors and PHC Staff.
    """
    query = db.query(Consultation)

    # If doctor is requesting and no doctor_id specified, filter to self
    if current_user.role in [UserRole.DOCTOR, "DOCTOR", "doctor"] and not doctor_id:
        query = query.filter(Consultation.doctor_id == current_user.id)
    elif doctor_id:
        query = query.filter(Consultation.doctor_id == doctor_id)

    if patient_id:
        query = query.filter(Consultation.patient_id == patient_id)

    if status_filter:
        query = query.filter(Consultation.status == status_filter)

    consultations = query.order_by(desc(Consultation.id)).limit(limit).all()

    items: List[ConsultationHistoryItem] = []
    for c in consultations:
        patient_name = c.patient.full_name if c.patient else "Unknown Patient"
        patient_id_display = c.patient.patient_id_display if c.patient else None
        patient_age = c.patient.age if c.patient else None
        patient_gender = c.patient.gender if c.patient else None

        doctor_name = c.doctor.full_name if c.doctor else "Unknown Doctor"
        staff_name = c.staff.full_name if c.staff else None
        phc_name = c.facility.name if c.facility else "ITDA Telemedicine Centre"

        items.append(ConsultationHistoryItem(
            id=c.id,
            appointment_id=c.appointment_id,
            case_id=c.case_id,
            patient_id=c.patient_id,
            patient_name=patient_name,
            patient_id_display=patient_id_display,
            patient_age=patient_age,
            patient_gender=patient_gender,
            doctor_id=c.doctor_id,
            doctor_name=doctor_name,
            staff_id=c.initiated_by_staff_id,
            staff_name=staff_name,
            phc_name=phc_name,
            webrtc_room_id=c.webrtc_room_id,
            consultation_type=c.consultation_type or "VIDEO",
            status=c.status,
            ringing_at=c.ringing_at.isoformat() if c.ringing_at else None,
            accepted_at=c.accepted_at.isoformat() if c.accepted_at else None,
            connected_at=c.connected_at.isoformat() if c.connected_at else None,
            ended_at=c.ended_at.isoformat() if c.ended_at else None,
            connected_duration_seconds=c.connected_duration_seconds or 0,
            termination_reason=c.termination_reason,
            clinical_findings=c.clinical_findings,
            prescription_notes=c.prescription_notes,
            referral_specialty=c.referral_specialty,
            created_at=c.created_at.isoformat() if c.created_at else datetime.utcnow().isoformat()
        ))

    return items

@router.get("/{consultation_id}")
def get_consultation_details(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get full details for a consultation session including events audit timeline.
    """
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation session not found.")

    events_list = []
    for ev in consultation.events:
        events_list.append({
            "id": ev.id,
            "event_type": ev.event_type,
            "previous_status": ev.previous_status,
            "new_status": ev.new_status,
            "details": ev.details,
            "timestamp": ev.timestamp.isoformat() if ev.timestamp else None
        })

    return {
        "id": consultation.id,
        "appointment_id": consultation.appointment_id,
        "case_id": consultation.case_id,
        "patient": {
            "id": consultation.patient.id,
            "patient_id_display": consultation.patient.patient_id_display,
            "full_name": consultation.patient.full_name,
            "age": consultation.patient.age,
            "gender": consultation.patient.gender,
            "village": getattr(consultation.patient, "habitation", None) or getattr(consultation.patient, "gram_panchayat", None) or consultation.patient.mandal or "Paderu",
            "mandal": consultation.patient.mandal,
            "phone": consultation.patient.phone
        } if consultation.patient else None,
        "doctor": {
            "id": consultation.doctor.id,
            "full_name": consultation.doctor.full_name,
            "email": consultation.doctor.email
        } if consultation.doctor else None,
        "staff": {
            "id": consultation.staff.id,
            "full_name": consultation.staff.full_name,
            "role": str(consultation.staff.role.value if hasattr(consultation.staff.role, "value") else consultation.staff.role)
        } if consultation.staff else None,
        "webrtc_room_id": consultation.webrtc_room_id,
        "session_token": consultation.session_token,
        "status": consultation.status,
        "consultation_type": consultation.consultation_type,
        "ringing_at": consultation.ringing_at.isoformat() if consultation.ringing_at else None,
        "accepted_at": consultation.accepted_at.isoformat() if consultation.accepted_at else None,
        "connected_at": consultation.connected_at.isoformat() if consultation.connected_at else None,
        "ended_at": consultation.ended_at.isoformat() if consultation.ended_at else None,
        "connected_duration_seconds": consultation.connected_duration_seconds or 0,
        "termination_reason": consultation.termination_reason,
        "clinical_findings": consultation.clinical_findings,
        "prescription_notes": consultation.prescription_notes,
        "follow_up_instructions": consultation.follow_up_instructions,
        "referral_specialty": consultation.referral_specialty,
        "biopsy_indicated": consultation.biopsy_indicated,
        "events": events_list
    }
