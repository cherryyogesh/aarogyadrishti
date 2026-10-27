import cv2
import numpy as np
import os
from pathlib import Path

def apply_conservative_enhancement(input_path: str, output_path: str) -> bool:
    """
    Applies conservative non-generative contrast enhancement:
    1. Converts image to LAB color space.
    2. Applies CLAHE (Contrast Limited Adaptive Histogram Equalization) on L-channel only.
    3. Merges channels and converts back to BGR.
    4. Applies gentle unsharp mask to improve boundary definition without hallucinating artifacts.
    """
    try:
        img = cv2.imread(input_path)
        if img is None:
            return False

        # 1. LAB color space CLAHE
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l_channel)

        limg = cv2.merge((cl, a_channel, b_channel))
        enhanced_bgr = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

        # 2. Gentle Unsharp Mask
        gaussian = cv2.GaussianBlur(enhanced_bgr, (0, 0), 2.0)
        unsharp = cv2.addWeighted(enhanced_bgr, 1.25, gaussian, -0.25, 0)

        # 3. Save enhanced image
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cv2.imwrite(output_path, unsharp)
        return True
    except Exception as e:
        print(f"Error enhancing image {input_path}: {e}")
        return False
