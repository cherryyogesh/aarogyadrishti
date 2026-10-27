# Implementation Plan: Aarogya Drishti
**Target Completion:** All 20 Master Build Phases  
**Methodology:** Phased, Test-Driven & Verified Delivery

---

## Phase Breakdown & Execution Sequence

### Phase 0: Repository Audit & Technical Blueprint
- [x] Audit workspace, operating environment, and available tools.
- [x] Initialize Git tracking.
- [x] Author `docs/PROJECT_AUDIT.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/FEATURE_CHECKLIST.md`, `docs/INTEGRATION_STATUS.md`.

### Phase 1: Backend Foundation & Database Layer
- [ ] Setup FastAPI directory structure (`backend/app/...`).
- [ ] Configure `core/config.py`, database connection with SQLAlchemy 2.0.
- [ ] Define relational models: `User`, `PHC`, `Patient`, `Consent`, `Screening`, `ScreeningImage`, `ImageProcessingResult`, `AIAnalysis`, `ClinicalReview`, `Appointment`, `AppointmentEvent`, `OTPAttempt`, `NotificationLog`, `ChatMessage`, `Referral`, `AuditEvent`.
- [ ] Build Alembic migration environment and initialization script.
- [ ] Implement database seed script (`backend/seed.py`) with realistic synthetic healthcare data.

### Phase 2: Security, Authentication & Role Authorization
- [ ] Implement password hashing (bcrypt) and JWT token generation/validation.
- [ ] Implement role-based dependency injectors (`require_role([...])`) and object-level authorization.
- [ ] Implement authentication endpoints (`/api/v1/auth/login`, `/api/v1/auth/me`).

### Phase 3: Image Quality & Conservative Enhancement Pipeline
- [ ] Build image validator (MIME inspection, file size limits, dimension checks).
- [ ] Implement OpenCV blur detection using Laplacian variance.
- [ ] Implement lighting/exposure evaluation via luminance histograms.
- [ ] Implement conservative non-generative enhancement: CLAHE (Contrast Limited Adaptive Histogram Equalization) and unsharp mask sharpening.
- [ ] Create image endpoints: `/api/v1/images/upload`, `/api/v1/images/analyze-quality`, `/api/v1/images/enhance`, protected file serving.

### Phase 4: Patient & Screening Workflow Backend
- [ ] Patient CRUD endpoints: search by ID/phone/name, registration, consent recording.
- [ ] Screening creation for 7 visible categories (Mouth, Skin, Wounds, Eye, Ear, Nose, Other) with explicit anatomical guidelines and disclaimers.
- [ ] Automated reference ID generation (e.g., `SCR-2026-XXXX`).

### Phase 5: Messaging & Real SMS Provider Adapter
- [ ] Build modular SMS Adapter with support for Twilio / DLT SMS Gateway and transparent synthetic development mode.
- [ ] Queue confirmation SMS upon screening creation.
- [ ] Queue appointment booking and reminder SMS.
- [ ] Full delivery tracking, retry counters, and duplicate prevention.

### Phase 6: PHC Case Management & Appointment Booking
- [ ] Review queue endpoints for PHC Medical Officers.
- [ ] Clinical review recording (image quality acceptance, consultation need, retake requests).
- [ ] Conflict-free appointment booking engine with slot reservation and audit reasons.

### Phase 7: Cryptographic OTP & Patient Check-in
- [ ] Secure 6-digit random OTP generation with SHA-256 salted storage.
- [ ] Rate limiting (max 3 attempts, 5-minute expiry, 60-second resend cooldown).
- [ ] Endpoint `/api/v1/otp/request` and `/api/v1/otp/verify`.
- [ ] Successful OTP verification triggers transition to "Checked in - Waiting for Doctor".

### Phase 8: Doctor Waiting Queue & Consultation Workspace
- [ ] Real-time waiting queue endpoint with live duration tracking.
- [ ] Doctor acceptance flow (`in_progress` transition).
- [ ] Clinical findings recording (provisional observations, recommendations, prescription notes, referral creation).
- [ ] Telemedicine WebRTC session token generation and room signaling.

### Phase 9: Safe Medical AI Chatbot & Image Attachment
- [ ] Hugging Face inference adapter with clinical triage rules.
- [ ] Strict safety barriers: refusal to diagnose cancer from photos alone, emergency red-flag symptom detection.
- [ ] Chat conversation endpoints supporting message history and image attachment analysis.

### Phase 10: District Reporting & Audit Log Viewer
- [ ] Aggregation queries for district dashboard (screenings by category, review backlog, arrival rates, wait times, SMS delivery rate).
- [ ] Comprehensive audit log viewer with actor, action, timestamp, and IP tracking.

### Phase 11: Modern React 18 + TypeScript Frontend
- [ ] Initialize Vite + React 18 + TypeScript frontend.
- [ ] Build custom healthcare design system (Deep Navy, Clinical Teal, accessible typography, cards, badges, buttons, drawers).
- [ ] Implement 6-language i18n system (Telugu, English, Hindi, Tamil, Malayalam, Kannada).
- [ ] Build all 24 connected screens:
  1. Login & Role Switcher
  2. Role-Aware Dashboard
  3. Patient Search & Registration
  4. Patient Details & Screening History
  5. Consent & Screening Creation (7 categories)
  6. Guided Image Capture & Upload
  7. Image Quality Review & Enhancement Comparison
  8. PHC Review Queue
  9. AI Findings & Clinician Review
  10. Appointment Booking
  11. Appointment Calendar & List
  12. Patient OTP Check-in
  13. Doctor Waiting Queue
  14. Consultation Workspace & WebRTC Telemedicine
  15. Medical AI Chatbot
  16. Chatbot Image Attachment & Preview (`+` button)
  17. Referral & Follow-up Management
  18. Notification Center & SMS Delivery Logs
  19. District Reporting Dashboard
  20. User & Role Management
  21. Language & Accessibility Settings
  22. Integration Configuration Status
  23. Audit Log Viewer
  24. Error, Empty, Offline & Loading States

### Phase 12: Android Packaging (Capacitor) & PWA
- [ ] Configure Web App Manifest, Service Worker, and icons.
- [ ] Set up Capacitor configuration (`capacitor.config.json`).
- [ ] Provide comprehensive step-by-step Android build documentation (`docs/ANDROID_BUILD.md`).

### Phase 13: Testing & Quality Assurance
- [ ] Backend test suite with pytest covering auth, appointments state machine, OTP security, image quality, and AI guardrails.
- [ ] Frontend build verification (`npm run build`).
- [ ] Documented end-to-end acceptance run.

### Phase 14: Final Delivery & Documentation
- [ ] Update `docs/API.md`, `docs/SECURITY.md`, `docs/DEPLOYMENT.md`, `docs/TEST_REPORT.md`, `docs/INTEGRATION_STATUS.md`.
- [ ] Summary of local execution commands and validation verification.
