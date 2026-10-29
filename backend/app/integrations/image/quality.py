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
    # Accept standard cropped mobile photos while filtering unreadable icons
    resolution_adequate = (width >= 80 and height >= 80)

    # 2. Convert to grayscale for blur and luminance analysis
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Blur detection via Laplacian variance (calibrated for mobile smartphone cameras)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    blur_score = float(laplacian.var())
    is_blurry = blur_score < 25.0  # Pragmatic threshold for mobile camera compression

    # Luminance / Exposure analysis (calibrated for oral cavity lighting)
    luminance_score = float(np.mean(gray))
    is_dark = luminance_score < 25.0
    is_overexposed = luminance_score > 238.0

    # Determine guidance and quality state
    guidance_notes = []
    if not resolution_adequate:
        guidance_notes.append("Image resolution is low. Please capture closer to the affected area.")
    if is_blurry:
        guidance_notes.append("The image has mild motion blur. Hold camera steady when capturing.")
    if is_dark:
        guidance_notes.append("The photo lighting is low. Use torch or daylight for clearer view.")
    if is_overexposed:
        guidance_notes.append("The photo has direct flash glare. Capture without direct harsh flash.")

    if not resolution_adequate or blur_score < 10.0:
        quality_state = "poor"
        guidance_message = "Image quality is very low or unreadable. " + " ".join(guidance_notes)
    elif is_blurry or is_dark or is_overexposed:
        quality_state = "acceptable"
        guidance_message = "Image acceptable for preliminary evaluation. " + " ".join(guidance_notes)
    else:
        quality_state = "excellent" if blur_score >= 100.0 and 70.0 <= luminance_score <= 190.0 else "acceptable"
        guidance_message = "Image quality is clear and verified for clinical review."

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
