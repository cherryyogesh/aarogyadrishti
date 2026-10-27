import os
import cv2
import numpy as np
import tempfile
from app.integrations.image.quality import analyze_image_quality
from app.integrations.image.enhancer import apply_conservative_enhancement

def test_opencv_blur_and_luminance_quality():
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a sharp image (high contrast checkerboard pattern)
        sharp_img = np.zeros((400, 400, 3), dtype=np.uint8)
        sharp_img[::20, :] = 255
        sharp_img[:, ::20] = 255
        sharp_path = os.path.join(tmpdir, "sharp.jpg")
        cv2.imwrite(sharp_path, sharp_img)

        # Create a blurry dark image (Gaussian blurred, low intensity)
        blurry_img = cv2.GaussianBlur(sharp_img, (51, 51), 0) // 10
        blurry_path = os.path.join(tmpdir, "blurry.jpg")
        cv2.imwrite(blurry_path, blurry_img)

        # Evaluate sharp image
        sharp_res = analyze_image_quality(sharp_path)
        assert sharp_res["resolution_adequate"] is True
        assert sharp_res["blur_score"] > 50.0

        # Evaluate blurry image
        blurry_res = analyze_image_quality(blurry_path)
        assert blurry_res["is_blurry"] is True or blurry_res["is_dark"] is True
        assert "retake" in blurry_res["quality_state"] or blurry_res["is_dark"] is True

def test_conservative_enhancement_clahe():
    with tempfile.TemporaryDirectory() as tmpdir:
        input_img = np.full((350, 350, 3), 120, dtype=np.uint8)
        input_path = os.path.join(tmpdir, "test_input.jpg")
        output_path = os.path.join(tmpdir, "enhanced.jpg")
        cv2.imwrite(input_path, input_img)

        success = apply_conservative_enhancement(input_path, output_path)
        assert success is True
        assert os.path.exists(output_path)
        assert os.path.getsize(output_path) > 0
