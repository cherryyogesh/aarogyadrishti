# Project Audit: Aarogya Drishti
**Date:** October 2026  
**Status:** Initialized & Verified  
**Auditor:** Lead Full-Stack & Healthcare Systems Engineer

---

## 1. Executive Summary
The workspace `c:\Users\AI\Desktop\aarogya drishti` was audited upon project initialization. The workspace began as a clean root directory without pre-existing legacy code, allowing us to implement a clean-architecture, enterprise-grade healthcare platform without legacy technical debt while strictly following all 20 Master Build phases specified in the requirements.

## 2. Environment & System Capabilities

| Component | Detected Version | Status / Notes |
| :--- | :--- | :--- |
| **Operating System** | Windows 11 (x64), PowerShell shell | Supported (`npm.cmd` / `npx.cmd` used for execution-policy safety) |
| **Node.js** | v24.19.0 | Verified |
| **npm** | 11.17.0 | Verified |
| **Python** | 3.12.10 | Verified |
| **Core Python Libraries** | FastAPI 0.141, Uvicorn 0.52, SQLAlchemy 2.0.51, Pydantic 2.13, Pillow 12.3, Pytest 9.1 | Pre-installed & verified |
| **Image & Migration Stack** | OpenCV (headless), Alembic, NumPy | Configured for image processing and schema migrations |
| **Database** | SQLite3 (local ACID file database) + SQLAlchemy PostgreSQL adapter support | Real transactional persistence with foreign key constraints, indexes, and migrations |

## 3. Technology Stack Selection

### Frontend
- **Framework:** React 18 with TypeScript and Vite.
- **Styling:** Custom Vanilla CSS Design System with CSS variables, responsive typography, fluid CSS Grid and Flexbox, glassmorphic navigation, high-contrast healthcare palette (Deep Navy `#0A192F`, `#0F172A`, Clinical Teal `#0D9488`, Cyan `#06B6D4`, Emerald `#10B981`, Amber `#F59E0B`, Crimson `#EF4444`).
- **Icons:** Lucide Icons for consistent, accessible visual cues.
- **Routing:** Lightweight client-side SPA routing with protected role gates and persistent browser history.
- **Internationalization:** Typed multi-language dictionary supporting 6 languages (Telugu, English, Hindi, Tamil, Malayalam, Kannada) with zero UI shifts and robust fallback.
- **PWA / Android Target:** Web App Manifest, Service Worker offline caching for static assets, touch-optimized camera/gallery triggers, Capacitor-ready architecture (`docs/ANDROID_BUILD.md`).

### Backend
- **Framework:** Python FastAPI with strict Pydantic v2 data validation schemas.
- **Database Layer:** SQLAlchemy ORM 2.0 with real transactional operations, automated tables initialization, and migration scripts.
- **Authentication & Authorization:** HTTP Bearer JWT tokens, real bcrypt password hashing, role-based and object-level permission enforcement across 5 distinct roles:
  1. Community Health Worker (CHW / ASHA)
  2. PHC Staff / Medical Officer (MO)
  3. Specialist / Doctor
  4. Patient Navigator
  5. District Administrator
- **Image Processing Pipeline:** OpenCV and Pillow for server-side image validation (MIME, dimensions, file size), Laplacian blur detection, luminance calculation (over/underexposure), and conservative non-generative enhancement (CLAHE, unsharp mask sharpening, bilateral denoising).
- **AI Inference Integration:** Hugging Face Inference API adapter with strict medical guardrails, clinical escalation rules for emergency symptoms, and safe triage advice.
- **Messaging Adapter:** Real SMS adapter interface supporting provider credentials (Twilio / DLT SMS Gateway) and a transparent, clearly labeled Synthetic Development Mode (`synthetic_dev_mode = True` when credentials are unset) with full transactional tracking, duplicate prevention, and retry counters.
- **Telemedicine / Video Consultation:** WebRTC signaling and consultation room management with real session token generation and doctor-patient queue synchronization.

## 4. Preservation & Compliance Directives
- **Zero Fake Implementations:** Real database persistence (SQLite/PostgreSQL), real OTP generation (cryptographically secure 6-digit tokens hashed with SHA-256 and salted), real attempt tracking, and real state machine transitions.
- **Data Minimization & Privacy:** No plaintext passwords or OTPs, masked phone numbers (`+91 ******1234`), segregated patient consent logs, and audit trail of every status transition.
