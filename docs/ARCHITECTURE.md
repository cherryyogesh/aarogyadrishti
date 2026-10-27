# System Architecture: Aarogya Drishti (ఆరోగ్య దృష్టి)
**Version:** 1.0.0  
**Scope:** Community Healthcare Screening, Visible-Abnormality Triage & Telemedicine Platform  
**Target Environments:** Responsive Mobile/Desktop Web & Hybrid Android (Capacitor)

---

## 1. High-Level Architectural Diagram

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT LAYER                                       |
|  +---------------------------------------------------------------------------------+  |
|  |                 React 18 + TypeScript + Vite Single Page Application            |  |
|  |   - Role-Based Portals (CHW, PHC Staff, Doctor, Patient Navigator, Admin)       |  |
|  |   - 6-Language Internationalization (TE, EN, HI, TA, ML, KN)                   |  |
|  |   - Responsive Design System (Mobile 320px -> Ultra-wide 1440px+)               |  |
|  |   - Plus-button Image Capture & Quality Preview UI                              |  |
|  |   - Telemedicine WebRTC Video Consultation Workspace                            |  |
|  |   - Real-time Doctor Waiting Queue & OTP Check-in Interface                    |  |
|  +---------------------------------------------------------------------------------+  |
|                                         |                                             |
|                     Capacitor Bridge (Android Native Shell)                           |
+---------------------------------------------------------------------------------------+
                                          |
                                    HTTPS / WSS / REST
                                          |
+---------------------------------------------------------------------------------------+
|                                  BACKEND API GATEWAY                                  |
|                            FastAPI (Python 3.12, Uvicorn)                             |
|  +---------------------------------------------------------------------------------+  |
|  |  [Security & Auth] JWT Bearer, Role Validation (RBAC), Object-Level Access      |  |
|  |  [State Machine] Appointment Lifecycle (Scheduled -> Checked In -> Consulted)  |  |
|  |  [Audit Logging] Immutable Transactional Logs & Patient Data Redaction          |  |
|  +---------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
           |                       |                      |                   |
           v                       v                      v                   v
+---------------------+ +--------------------+ +--------------------+ +---------------+
|  PERSISTENCE LAYER  | | IMAGE PROCESSING   | | AI ADAPTER         | | MESSAGING     |
|  SQLAlchemy 2.0     | | OpenCV / Pillow    | | Hugging Face       | | SMS & OTP     |
|  - Users & Roles    | | - Blur (Laplacian) | | Inference API      | | Provider      |
|  - Patients & PHCs  | | - Exposure/Luminance| - Clinical Guardrails| | - Cryptographic|
|  - Screenings       | | - CLAHE Enhancement| - Triage Reasoning   | |   OTP Gen     |
|  - Images & Quality | | - Unsharp Sharpen  | - Non-diagnostic     | | - DLT/Twilio  |
|  - Appointments     | | - Dimension check  |   Guidance           | |   Adapter     |
|  - Consultations    | +--------------------+ +--------------------+ | - Synthetic   |
|  - Audit Events     |                                               |   Dev Mode    |
+---------------------+                                               +---------------+
```

---

## 2. Component Separation & Responsibility Matrix

### 2.1 Frontend Modules (`frontend/src/`)
- `app/`: Application routing, state initialization, navigation shell, responsive layout wrappers.
- `components/`: Accessible UI design system (buttons, inputs, cards, badges, modal dialogs, drawer menus, tabs, indicators).
- `features/auth/`: Login, role switching, token storage, and session invalidation.
- `features/patients/`: Patient directory, search by ID/phone/name, registration, consent recording.
- `features/screening/`: 7-category visible health screening (Mouth, Skin, Wounds, Eye, Ear, Nose, Other), symptom capture, guided photography.
- `features/image-quality/`: Live image validation feedback (blur score, lighting rating, resolution checklist, retake recommendations, conservative enhancement comparison).
- `features/phc/`: PHC queue management, clinical review, next action assignment, consultation scheduling.
- `features/appointments/`: Calendar/list views, conflict-free booking, rescheduling with audit reasons.
- `features/otp/`: Patient arrival workflow, 6-digit OTP verification, rate-limit countdown.
- `features/doctor/`: Live waiting queue, patient acceptance, consultation workspace, diagnosis/prescription/referral notes.
- `features/video/`: WebRTC telemedicine consultation room with camera, microphone, screen share, and session status.
- `features/chatbot/`: Medical AI assistant with visible `+` attachment button (Camera/Gallery/File), chat message bubble composer, stop/retry controls, and multilingual disclaimers.
- `features/admin/`: User/role management, PHC directory, aggregate district health analytics, audit log viewer.
- `i18n/`: Comprehensive translations for Telugu, English, Hindi, Tamil, Malayalam, Kannada with zero-lag fallback.
- `services/`: Axios/Fetch API client with JWT interception, offline detection, and error normalization.

### 2.2 Backend Modules (`backend/app/`)
- `core/config.py`: Environment configuration, security constants, provider credentials.
- `core/database.py`: SQLAlchemy engine, session management, SQLite/PostgreSQL connection pooling.
- `models/`: Database entities with relational constraints, foreign keys, and indexes.
- `schemas/`: Pydantic request and response schemas with strict data validation.
- `api/`: REST endpoints partitioned by domain (`auth`, `patients`, `screenings`, `images`, `phc`, `appointments`, `otp`, `doctor`, `consultations`, `chatbot`, `reports`, `audit`).
- `services/`: Domain business logic and appointment state machine.
- `integrations/ai/`: Hugging Face inference client with safe clinical fallback and emergency symptom detection.
- `integrations/sms/`: SMS adapter with provider interfaces (Twilio/DLT Gateway) and transparent synthetic dev mode.
- `integrations/image/`: OpenCV and Pillow validation, blur detection (Laplacian variance), luminance analysis, and conservative enhancement (CLAHE, unsharp filter).
- `security/`: Bcrypt password hashing, JWT creation/decoding, secure random OTP generation, rate limiting.

---

## 3. Security, Privacy & Data Protection Architecture

1. **Patient Data Protection:** Phone numbers masked in non-administrative screens (`+91 98****1234`). Full phone numbers only accessible during active OTP dispatch.
2. **Cryptographic OTP Security:**
   - Generated via `secrets.randbelow(900000) + 100000` (true 6-digit cryptographic entropy).
   - Stored hashed using SHA-256 with appointment-specific salt; never stored in plaintext.
   - Strictly enforced 5-minute expiry, max 3 attempts before automatic invalidation, and 60-second resend cooldown.
3. **Role-Based Access Control (RBAC):** Every endpoint validates JWT token claims and enforces least privilege:
   - CHW: Patient registration, screening creation, check-in assist.
   - PHC Staff: Case review, doctor triage, appointment booking/rescheduling.
   - Doctor: Queue acceptance, clinical findings, prescription notes, telemedicine.
   - Patient Navigator: Referral tracking, contact attempt logs.
   - District Admin: User creation, operational reports, system-wide audit logs.
4. **Image Storage Protection:** Uploaded images stored in protected internal directory (`backend/storage/uploads/`), served only through authenticated routes with token verification.

---

## 4. Android Packaging & Hybrid Strategy

- **Core Strategy:** The responsive web application is wrapped using **Capacitor** for Android build generation.
- **Native Bridges:**
  - Camera & Gallery access using `@capacitor/camera` and standard HTML5 input fallback.
  - Back-button navigation handling using `@capacitor/app`.
  - Network state monitoring using `@capacitor/network`.
  - Android APK generated with Gradle (`android/` directory).
- **Backend Consistency:** Native Android app communicates with the identical FastAPI backend endpoints. All AI inference, SMS queues, OTP verification, and database persistence remain strictly server-side.
