import os
import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.entities import ScreeningImage, ImageProcessingResult, User, UserRole
from app.schemas.all_schemas import ImageUploadResponse, ImageQualityResult
from app.integrations.image.quality import analyze_image_quality
from app.integrations.image.enhancer import apply_conservative_enhancement
from app.api.deps import get_current_user

router = APIRouter(prefix="/images", tags=["Images"])

ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]

@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. MIME and Size Validation
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format '{file.content_type}'. Supported formats: JPEG, PNG, WEBP."
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        ext = ".jpg"

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(settings.STORAGE_DIR, unique_filename)

    # 2. Save stream to disk securely
    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {e}")

    file_size = os.path.getsize(dest_path)
    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        os.remove(dest_path)
        raise HTTPException(status_code=400, detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB.")

    # 3. OpenCV Analysis
    quality_data = analyze_image_quality(dest_path)

    # Read image dimensions
    import cv2
    img = cv2.imread(dest_path)
    height, width = (img.shape[0], img.shape[1]) if img is not None else (0, 0)

    # 4. Save DB Records (associated with temporary screening_id=None until screening created)
    image_record = ScreeningImage(
        screening_id=None,  # Will be updated when screening is committed
        original_filename=file.filename,
        stored_path=dest_path,
        file_size_bytes=file_size,
        width=width,
        height=height,
        mime_type=file.content_type or "image/jpeg"
    )
    db.add(image_record)
    db.flush()

    processing_record = ImageProcessingResult(
        image_id=image_record.id,
        is_blurry=quality_data["is_blurry"],
        blur_score=quality_data["blur_score"],
        is_dark=quality_data["is_dark"],
        is_overexposed=quality_data["is_overexposed"],
        luminance_score=quality_data["luminance_score"],
        resolution_adequate=quality_data["resolution_adequate"],
        quality_state=quality_data["quality_state"],
        guidance_message=quality_data["guidance_message"]
    )
    db.add(processing_record)
    db.commit()
    db.refresh(image_record)

    return ImageUploadResponse(
        image_id=image_record.id,
        original_filename=file.filename,
        file_size_bytes=file_size,
        width=width,
        height=height,
        quality=ImageQualityResult(**quality_data),
        preview_url=f"/api/v1/images/{image_record.id}/file"
    )

@router.post("/{id}/enhance")
def enhance_image(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    image_record = db.query(ScreeningImage).filter(ScreeningImage.id == id).first()
    if not image_record or not os.path.exists(image_record.stored_path):
        raise HTTPException(status_code=404, detail="Image record or file not found.")

    enhanced_dir = os.path.join(settings.STORAGE_DIR, "enhanced")
    os.makedirs(enhanced_dir, exist_ok=True)
    enhanced_filename = f"enh_{os.path.basename(image_record.stored_path)}"
    enhanced_path = os.path.join(enhanced_dir, enhanced_filename)

    success = apply_conservative_enhancement(image_record.stored_path, enhanced_path)
    if not success:
        raise HTTPException(status_code=500, detail="Conservative enhancement failed to execute.")

    # Update processing record
    proc = db.query(ImageProcessingResult).filter(ImageProcessingResult.image_id == id).first()
    if proc:
        proc.enhanced_path = enhanced_path
        db.commit()

    return {
        "success": True,
        "enhanced_url": f"/api/v1/images/{id}/enhanced",
        "method": "CLAHE (L-channel LAB) + Unsharp Mask (Non-generative)"
    }

@router.get("/{id}/file")
def get_image_file(id: int, db: Session = Depends(get_db)):
    image_record = db.query(ScreeningImage).filter(ScreeningImage.id == id).first()
    if not image_record or not os.path.exists(image_record.stored_path):
        raise HTTPException(status_code=404, detail="Image file not found.")
    return FileResponse(image_record.stored_path, media_type=image_record.mime_type)

@router.get("/{id}/enhanced")
def get_enhanced_image_file(id: int, db: Session = Depends(get_db)):
    proc = db.query(ImageProcessingResult).filter(ImageProcessingResult.image_id == id).first()
    if not proc or not proc.enhanced_path or not os.path.exists(proc.enhanced_path):
        raise HTTPException(status_code=404, detail="Enhanced image not found.")
    return FileResponse(proc.enhanced_path, media_type="image/jpeg")
