# Security, Privacy & Data Governance: Aarogya Drishti
**Standard:** Healthcare Security, Cryptography & Privacy Policy  
**Status:** Implemented & Verified

---

## 1. Authentication & Role-Based Access Control (RBAC)
- **Token Security:** HTTP Bearer JSON Web Tokens signed with HMAC-SHA256. Short-lived tokens with secure claims.
- **Password Protection:** Password hashing using bcrypt with configurable work factor. No plaintext credentials stored or transmitted.
- **5 Discrete Roles Enforced on Server-Side:**
  1. `chw` (Community Health Worker): Patient search & registration, consent recording, visual screening creation, check-in assist.
  2. `phc_staff` (PHC Medical Officer): Clinical case review, appointment booking, rescheduling.
  3. `doctor` (Specialist Doctor): Waiting queue acceptance, telemedicine workspace, clinical notes, prescriptions, hospital referrals.
  4. `navigator` (Patient Navigator): Referral coordination and follow-up logging.
  5. `admin` (District Administrator): User management, operational reports, immutable audit logs.
- **Least Privilege:** Hiding UI elements is never used as a substitute for security. Every API endpoint enforces role dependencies (`require_roles([...])`).

---

## 2. Cryptographic OTP Check-in Architecture
- **Cryptographic Entropy:** Generated via Python `secrets.randbelow(900000) + 100000`, guaranteeing true pseudo-random 6-digit codes.
- **Zero Plaintext Storage:** OTPs are immediately salted with a unique UUID salt and hashed using SHA-256 before database insertion. The plaintext code exists only in memory during SMS transmission.
- **Timing Attack Resistance:** Verification uses `secrets.compare_digest` to prevent timing-based side-channel attacks.
- **Exhaustion Lockout & Expiry:** Enforces a strict 5-minute expiry, a maximum of 3 verification attempts before irreversible locking, and a 60-second resend cooldown.

---

## 3. Patient Data Privacy & Redaction
- **Phone Number Masking:** In all non-administrative and list views, phone numbers are masked:
  `+91 98481 23456` -> `+91 9****3456`.
- **Protected File Storage:** Images are uploaded to internal server storage (`backend/storage/uploads/`) with random UUID filenames. Images are never exposed via a public directory; they are served solely via authenticated API endpoints (`/api/v1/images/{id}/file`).
- **Data Minimization:** Only clinically necessary demographic information is collected.

---

## 4. Medical AI Clinical Guardrails & Liability Protection
- **No Unassisted Diagnosis:** The AI model is strictly configured as a preliminary screening and triage aid.
- **Cancer Diagnostic Barrier:** The system strictly refuses to diagnose or rule out cancer or malignant tumors based on symptoms or photographs alone, explicitly directing patients to biopsy and specialist pathology examination.
- **Emergency Escalation:** Severe symptoms (uncontrolled bleeding, severe breathlessness, signs of stroke, severe chest pressure) immediately trigger high-priority emergency hospital guidance (Ambulance 108).
- **Mandatory Disclaimers:** Every AI response includes a multi-language disclaimer that the guidance is non-diagnostic.

---

## 5. Transactional Integrity & Audit Logs
- **ACID Database Operations:** Relational integrity enforced through foreign keys and transactional rollbacks on failures.
- **State Machine Safeguard:** Appointment state transitions (`scheduled` -> `waiting_for_doctor` -> `in_consultation` -> `completed`) are strictly validated on the backend.
- **Immutable Audit Events:** Every user sign-in, patient registration, OTP verification, case acceptance, and consultation completion is immutably logged with user ID, target entity, timestamp, and details.
