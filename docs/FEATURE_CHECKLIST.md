# Feature Checklist: Aarogya Drishti
**Live Status: 100% Implemented & Verified**

---

## 1. Authentication, Roles & Authorization
- [x] Multi-role user login (Email/Username + Password)
- [x] JWT Bearer Token issue and verification
- [x] Role 1: Community Health Worker (CHW / ASHA)
- [x] Role 2: PHC Staff / Medical Officer (MO)
- [x] Role 3: Specialist / Doctor
- [x] Role 4: Patient Navigator
- [x] Role 5: District Administrator
- [x] Role-based UI gating and server-side route protection
- [x] Object-level authorization for patient records
- [x] Secure logout and token invalidation

## 2. Patient Management & Consent
- [x] Patient directory with fast search (ID, phone, full name)
- [x] Patient registration with demographic capture
- [x] Masked phone number display for privacy (`+91 ******1234`)
- [x] Digital consent recording with explicit terms
- [x] Patient detailed view with history timeline

## 3. Visible-Health Screening Workflow
- [x] 7 screening categories (Mouth, Skin, Wounds, Eye, Ear, Nose, Other)
- [x] Category-specific anatomical capture instructions and limitations
- [x] Symptom recording, onset duration, and severity selection
- [x] Unique screening reference ID generator (e.g., `SCR-2026-XXXX`)
- [x] Separation of AI suggestions from clinician-confirmed findings

## 4. Image Capture, Quality Assessment & Enhancement
- [x] Client-side and server-side file upload validation
- [x] Dimension, file size, and MIME content verification
- [x] Blur detection using OpenCV Laplacian variance
- [x] Lighting/Exposure analysis via luminance calculation
- [x] Actionable user guidance ("Photo is too dark", "Image is blurry", etc.)
- [x] Non-generative conservative enhancement (CLAHE + unsharp sharpening)
- [x] Side-by-side comparison for authorized clinical staff

## 5. Automatic SMS Notifications & Provider Adapter
- [x] Configurable SMS provider adapter (Twilio / DLT SMS Gateway)
- [x] Synthetic development mode with full audit trail when unconfigured
- [x] Screening confirmation SMS queueing
- [x] Appointment booking SMS (with 30-min early arrival notice)
- [x] Rescheduling / Cancellation notifications
- [x] Retry queue with exponential backoff and duplicate prevention
- [x] In-app notification center for staff

## 6. PHC Case Management & Appointment Booking
- [x] PHC case review dashboard with status filters
- [x] Clinician review form (satisfactory / repeat photo / needs consult)
- [x] Appointment booking engine with doctor slot conflict check
- [x] Rescheduling and cancellation with mandatory audit reason
- [x] Appointment list and calendar views

## 7. Patient OTP Check-in & Arrival Workflow
- [x] Patient ID search on physical arrival
- [x] Cryptographic 6-digit OTP generation (`secrets.randbelow`)
- [x] Salted SHA-256 hashed OTP storage (no plaintext)
- [x] 5-minute expiry and 3-attempt lock
- [x] 60-second resend cooldown timer
- [x] Successful OTP verification moves appointment to "Waiting for Doctor"
- [x] Audit log entry for every check-in attempt

## 8. Doctor Queue & Telemedicine Consultation
- [x] Live doctor waiting queue with dynamic wait duration
- [x] "Patient arrived - waiting for doctor" status indicator
- [x] Case acceptance action by doctor
- [x] Telemedicine consultation workspace
- [x] WebRTC peer video/audio room connection
- [x] Clinical findings recording (provisional notes, prescription, referrals)

## 9. Safe Medical AI Chatbot
- [x] Hugging Face inference adapter with clinical fallback
- [x] Refusal to diagnose cancer from symptoms or photos alone
- [x] Emergency red-flag symptom detection and emergency guidance
- [x] Visible `+` attachment button (Camera, Gallery, File)
- [x] Image attachment preview, quality check, and removal before send
- [x] Multilingual chat responses and visible medical disclaimer

## 10. Six-Language Internationalization
- [x] Telugu (తెలుగు)
- [x] English (English)
- [x] Hindi (हिन्दी)
- [x] Tamil (தமிழ்)
- [x] Malayalam (മലയാളം)
- [x] Kannada (ಕನ್ನಡ)
- [x] Zero-lag language switcher across all 24 views

## 11. District Analytics & Audit Trails
- [x] Screening trends by category and PHC
- [x] Operational metrics: arrival rate, wait times, backlog
- [x] System-wide audit log viewer for district administrators
- [x] Redacted data export capability

## 12. PWA & Android Build Readiness
- [x] Web App Manifest (`manifest.json`)
- [x] Service Worker / cache readiness
- [x] Mobile responsive layout tested at 320px, 360px, 390px, 768px, 1024px, 1440px
- [x] Touch-friendly bottom navigation and floating controls
- [x] Capacitor configuration and detailed Android APK guide (`docs/ANDROID_BUILD.md`)
