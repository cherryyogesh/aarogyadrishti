from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.entities import User, AuditEvent
from app.schemas.all_schemas import LoginRequest, Token, UserResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    identifier = payload.username_or_email.strip().lower()
    user = db.query(User).filter(
        (User.email.ilike(identifier)) | (User.username.ilike(identifier))
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is deactivated. Contact district administrator.",
        )

    access_token = create_access_token(subject=user.id, role=user.role.value)

    # Log audit event
    audit = AuditEvent(
        user_id=user.id,
        action="LOGIN_SUCCESS",
        entity_type="User",
        entity_id=str(user.id),
        details=f"User {user.username} ({user.role.value}) logged in successfully."
    )
    db.add(audit)
    db.commit()

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role.value,
        phc_id=user.phc_id,
        phc_name=user.phc.name if user.phc else None
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
