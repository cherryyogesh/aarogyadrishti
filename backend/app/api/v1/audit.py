from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import AuditEvent, User, UserRole
from app.schemas.all_schemas import AuditEventResponse
from app.api.deps import require_roles

router = APIRouter(prefix="/audit", tags=["Audit Log"])

@router.get("/events", response_model=List[AuditEventResponse])
def get_audit_events(
    action: Optional[str] = Query(None),
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    query = db.query(AuditEvent)
    if action:
        query = query.filter(AuditEvent.action == action)

    events = query.order_by(AuditEvent.timestamp.desc()).limit(limit).all()

    results = []
    for e in events:
        user_name = None
        if e.user_id:
            u = db.query(User).filter(User.id == e.user_id).first()
            if u:
                user_name = f"{u.full_name} ({u.role.value})"

        results.append(AuditEventResponse(
            id=e.id,
            user_name=user_name,
            action=e.action,
            entity_type=e.entity_type,
            entity_id=e.entity_id,
            details=e.details,
            ip_address=e.ip_address,
            timestamp=e.timestamp
        ))
    return results
