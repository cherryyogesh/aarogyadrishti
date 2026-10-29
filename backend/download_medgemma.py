"""
Google Health MedGemma 1.5 4B Local Model Downloader
Official Model Reference: https://huggingface.co/google/medgemma-4b-it
Google Health AI Developer Foundations (HAIDF) Community License

Prerequisites:
1. Create a free account on https://huggingface.co
2. Visit https://huggingface.co/google/medgemma-4b-it (or google/medgemma-1.5-4b-it)
3. Review and accept the Health AI Developer Foundations terms of use.
4. Generate a Hugging Face Read Token at https://huggingface.co/settings/tokens
5. Run: python download_medgemma.py --token <YOUR_HF_TOKEN>
"""

import os
import sys
import argparse
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent / "models" / "medgemma"
MODEL_REPO = "google/medgemma-4b-it"

def check_requirements():
    print("=" * 70)
    print("Google MedGemma 1.5 4B — Local Download & Installation Helper")
    print("=" * 70)
    print(f"Target local storage directory: {MODEL_DIR}")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # Check disk space
    import shutil
    total, used, free = shutil.disk_usage(MODEL_DIR)
    free_gb = free / (1024 ** 3)
    print(f"Free disk space on drive: {free_gb:.2f} GB")
    if free_gb < 10.0:
        print("[WARNING] Less than 10 GB free space. Downloading weights may fail if space runs out.")
    else:
        print("[OK] Sufficient disk space available (MedGemma requires ~3-8 GB).")

def download_model(hf_token: str, quantized: bool = True):
    try:
        from huggingface_hub import snapshot_download, hf_hub_download
    except ImportError:
        print("\n[INFO] Installing 'huggingface_hub'...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "huggingface_hub"])
        from huggingface_hub import snapshot_download, hf_hub_download

    print(f"\nAuthenticating with Hugging Face for repo: {MODEL_REPO}")
    print("Please ensure you have accepted the Google Health terms at:")
    print(f"https://huggingface.co/{MODEL_REPO}\n")

    try:
        print("Starting download of Google MedGemma weights directly to local directory...")
        snapshot_download(
            repo_id=MODEL_REPO,
            local_dir=str(MODEL_DIR),
            token=hf_token,
            ignore_patterns=["*.msgpack", "*.h5"],
            resume_download=True
        )
        print(f"\n[SUCCESS] MedGemma weights successfully downloaded to: {MODEL_DIR}")
        print("Your local FastAPI backend can now load these weights with zero external API calls.")
    except Exception as e:
        print(f"\n[ERROR] Download failed: {e}")
        print("\nCommon Causes & Solutions:")
        print("1. 'Gated repo': Ensure you clicked 'Acknowledge license' on https://huggingface.co/google/medgemma-4b-it")
        print("2. 'Invalid token': Check that your token has 'Read' permissions on https://huggingface.co/settings/tokens")
        print("3. Network timeout: Re-run this command; huggingface_hub will automatically resume download.")

def main():
    parser = argparse.ArgumentParser(description="Download official Google MedGemma 1.5 4B weights for local inference.")
    parser.add_argument("--token", type=str, default="", help="Hugging Face access token with Read permissions.")
    parser.add_argument("--check-only", action="store_true", help="Only check local hardware and model status.")
    args = parser.parse_args()

    check_requirements()

    if args.check_only:
        existing_files = list(MODEL_DIR.glob("*"))
        print(f"Local model directory contains {len(existing_files)} file(s).")
        return

    token = args.token or os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY")
    if not token:
        print("\n[ACTION REQUIRED]")
        print("To download the gated official weights, provide your Hugging Face token:")
        print("Usage: python download_medgemma.py --token hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
        print("Or set environment variable: HF_TOKEN=hf_xxxx")
        return

    download_model(token)

if __name__ == "__main__":
    main()
