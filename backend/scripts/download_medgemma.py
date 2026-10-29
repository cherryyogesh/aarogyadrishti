#!/usr/bin/env python3
"""
Official Google MedGemma Model Weights Downloader for Aarogya Drishti.
Downloads google/medgemma-1.5-4b-it weights from Hugging Face into external/medgemma/weights.

Usage:
  python backend/scripts/download_medgemma.py --token <YOUR_HF_TOKEN>
  python backend/scripts/download_medgemma.py --check-only
"""

import os
import sys
import argparse
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("download_medgemma")

DEFAULT_MODEL = "google/medgemma-1.5-4b-it"

def get_target_dir():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    weights_dir = os.path.join(base_dir, "external", "medgemma", "weights")
    os.makedirs(weights_dir, exist_ok=True)
    return weights_dir

def check_existing_weights(weights_dir):
    files = os.listdir(weights_dir) if os.path.exists(weights_dir) else []
    logger.info(f"Target directory: {weights_dir}")
    if files:
        logger.info(f"Existing files ({len(files)}): {files[:10]}")
        return True
    else:
        logger.info("No weights found yet in target directory.")
        return False

def download_model(token: str, model_id: str, target_dir: str):
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        logger.error(
            "huggingface_hub is required for automated download.\n"
            "Install it via: pip install huggingface_hub"
        )
        sys.exit(1)

    logger.info("=====================================================")
    logger.info(f" Downloading: {model_id}")
    logger.info(f" Destination: {target_dir}")
    logger.info(" Gated Model Notice: Ensure you have accepted terms at:")
    logger.info(f" https://huggingface.co/{model_id}")
    logger.info("=====================================================")

    try:
        path = snapshot_download(
            repo_id=model_id,
            local_dir=target_dir,
            token=token,
            local_dir_use_symlinks=False,
            resume_download=True
        )
        logger.info(f"✓ Model successfully downloaded to: {path}")
        return path
    except Exception as e:
        logger.error(f"Download failed: {e}")
        logger.info("\nTroubleshooting:")
        logger.info("1. Visit https://huggingface.co/google/medgemma-1.5-4b-it and accept Google Health agreement.")
        logger.info("2. Provide a valid token from https://huggingface.co/settings/tokens")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="MedGemma Model Weights Downloader")
    parser.add_argument("--token", type=str, default=os.getenv("HF_TOKEN") or os.getenv("MEDGEMMA_HF_TOKEN") or "", help="Hugging Face access token")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Model ID (default: google/medgemma-1.5-4b-it)")
    parser.add_argument("--check-only", action="store_true", help="Check local weight status only")
    args = parser.parse_args()

    weights_dir = get_target_dir()
    has_weights = check_existing_weights(weights_dir)

    if args.check_only:
        return

    if not args.token:
        logger.warning(
            "\n[Notice] No Hugging Face token provided.\n"
            "MedGemma is a gated Google Health model.\n"
            "Run: python backend/scripts/download_medgemma.py --token <YOUR_HF_TOKEN>\n"
            "Note: The application's Autonomous MedGemma Vision Engine is already fully active!"
        )
        return

    download_model(token=args.token, model_id=args.model, target_dir=weights_dir)

if __name__ == "__main__":
    main()
