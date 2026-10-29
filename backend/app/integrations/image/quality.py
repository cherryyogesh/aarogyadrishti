import cv2
import numpy as np
from PIL import Image
from pathlib import Path
from typing import Tuple, Dict, Any

def analyze_image_quality(file_path: str) -> Dict[str, Any]:
    """
    Inspect image for blur, lighting, resolution, and basic framing.
    Uses Laplacian variance for blur detection and grayscale luminance distribution.
    """
    # 1. Read image with OpenCV
    img = cv2.imread(file_path)
    if img is None:
        return {
            "is_blurry": True,
            "blur_score": 0.0,
            "is_dark": True,
            "is_overexposed": False,
            "luminance_score": 0.0,
            "resolution_adequate": False,
            "quality_state": "poor",
            "guidance_message": "Unsupported or corrupted image file format."
        }

    height, width = img.shape[:2]
    # Adequate resolution: Minimum 160px per dimension or at least 40,000 total pixels (e.g. 200x200, 474x248, 640x480)
    resolution_adequate = (width >= 160 and height >= 160) or (width * height >= 40000)

    # 2. Convert to grayscale for blur and luminance analysis
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Blur detection via Laplacian variance
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    blur_score = float(laplacian.var())
    is_blurry = blur_score < 40.0  # Focus threshold where morphological edges become indistinguishable

    # Luminance / Exposure analysis
    luminance_score = float(np.mean(gray))
    is_dark = luminance_score < 35.0
    is_overexposed = luminance_score > 230.0

    # Determine guidance and quality state
    guidance_notes = []
    if not resolution_adequate:
        guidance_notes.append("Image resolution is low. Please capture closer to the affected area.")
    if is_blurry:
        guidance_notes.append("The image is blurry; please hold the camera steady and retake.")
    if is_dark:
        guidance_notes.append("The photo is too dark. Increase lighting or use a flashlight.")
    if is_overexposed:
        guidance_notes.append("The photo is overexposed or has excessive flash glare. Reduce direct light.")

    if not guidance_notes:
        quality_state = "excellent" if blur_score >= 120.0 and 70.0 <= luminance_score <= 180.0 else "acceptable"
        guidance_message = "Image quality is clear and acceptable for clinical review."
    else:
        is_severe = (blur_score < 25.0) or (luminance_score < 25.0) or (width * height < 20000)
        quality_state = "retake_recommended" if is_severe else "acceptable"
        guidance_message = " ".join(guidance_notes)

    return {
        "is_blurry": is_blurry,
        "blur_score": round(blur_score, 2),
        "is_dark": is_dark,
        "is_overexposed": is_overexposed,
        "luminance_score": round(luminance_score, 2),
        "resolution_adequate": resolution_adequate,
        "quality_state": quality_state,
        "guidance_message": guidance_message
    }
