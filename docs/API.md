# API Specification: Aarogya Drishti
**Version:** 1.0.0  
**Base URL:** `/api/v1`  
**Authentication:** HTTP Bearer JWT (`Authorization: Bearer <token>`)

---

## 1. Authentication (`/auth`)

### `POST /auth/login`
- **Description:** Authenticates user via email/username and password.
- **Request Body:**
  ```json
  {
    "username_or_email": "chw@aarogya.gov.in",
    "password": "ChwPass@2026"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user_id": 1,
    "username": "chw_sarala",
    "full_name": "Sarala Devi (ASHA / CHW)",
    "role": "chw",
    "phc_id": 1,
    "phc_name": "Kandukur Community Health Centre"
  }
  ```

### `GET /auth/me`
- **Description:** Returns profile and role claims of the authenticated user.

---

## 2. Patients (`/patients`)

### `GET /patients/search?q={query}`
- **Description:** Search patient registry by ID (`AD-10021`), full name, or phone. Non-privileged roles view masked phone numbers (`+91 ******1234`).

### `POST /patients`
- **Description:** Registers a new patient and records informed digital consent.
- **Request Body:**
  ```json
  {
    "full_name": "Venkata Subbamma",
    "age": 42,
    "gender": "Female",
    "phone": "+91 98480 12345",
    "preferred_language": "te",
    "address": "Door No 2-10",
    "village_town": "Kandukur",
    "phc_id": 1,
    "consent_granted": true,
    "consent_notes": "Oral informed consent verified in Telugu"
  }
  ```

### `GET /patients/{id}`
- **Description:** Retrieves detailed patient demography, consent logs, past screenings, and appointment history.

---

## 3. Visible-Health Screenings (`/screenings`)

### `POST /screenings`
- **Description:** Records a visible health screening, generates reference ID (`SCR-2026-XXXX`), executes AI triage engine, and queues confirmation SMS to patient.
- **Request Body:**
  ```json
  {
    "patient_id": 1,
    "phc_id": 1,
    "category": "skin",
    "symptoms": "Itchy erythematous lesion on forearm for 4 days.",
    "duration_days": 4,
    "severity": "moderate",
    "image_id": 12
  }
  ```
- **Categories:** `mouth`, `skin`, `wounds`, `eye`, `ear`, `nose`, `other`.

### `GET /screenings`
- **Description:** Lists screenings filtered by PHC, category, or status.

---

## 4. Image Quality & Enhancement (`/images`)

### `POST /images/upload`
- **Description:** Uploads image, checks file format (JPEG, PNG, WEBP) and size (max 15MB). Computes OpenCV blur score (Laplacian variance), luminance, and actionable quality feedback.
- **Response:**
  ```json
  {
    "image_id": 1,
    "original_filename": "lesion.jpg",
    "file_size_bytes": 142050,
    "width": 800,
    "height": 600,
    "quality": {
      "is_blurry": false,
      "blur_score": 182.4,
      "is_dark": false,
      "is_overexposed": false,
      "luminance_score": 118.2,
      "resolution_adequate": true,
      "quality_state": "excellent",
      "guidance_message": "Image quality is clear and acceptable for clinical review."
    },
    "preview_url": "/api/v1/images/1/file"
  }
  ```

### `POST /images/{id}/enhance`
- **Description:** Applies conservative, non-generative CLAHE contrast enhancement and unsharp mask. Preserves original image and creates an enhanced copy for side-by-side clinician comparison.

---

## 5. PHC Review & Appointment Booking (`/phc` & `/appointments`)

### `GET /phc/cases`
- **Description:** Retrieves cases awaiting PHC medical officer review.

### `POST /phc/cases/{id}/review`
- **Description:** Records clinical review outcome (`consultation_booked`, `repeat_photo`, `safe_observation`, `referral_made`).

### `POST /appointments`
- **Description:** Books consultation with doctor slot conflict check. Automatically calculates arrival time 30 minutes prior to scheduled time. Dispatches appointment SMS.

### `PUT /appointments/{id}/reschedule`
- **Description:** Reschedules appointment. Requires mandatory documented reason for audit logs.

### `PUT /appointments/{id}/cancel`
- **Description:** Cancels appointment with mandatory reason.

---

## 6. Patient ID & OTP Check-in (`/otp`)

### `POST /otp/request`
- **Description:** Enters patient arrival, verifies appointment, generates salted 6-digit cryptographic OTP, enforces 60-second cooldown, dispatches SMS.
- **Request Body:**
  ```json
  {
    "patient_id_display": "AD-10022"
  }
  ```

### `POST /otp/verify`
- **Description:** Validates OTP against salted SHA-256 hash. Enforces 3-attempt limit and 5-minute expiry. On success, transitions appointment to `waiting_for_doctor` and records `checkin_time`.

---

## 7. Doctor Queue & Telemedicine (`/doctor` & `/consultations`)

### `GET /doctor/waiting-queue`
- **Description:** Real-time waiting queue of checked-in patients with dynamic waiting duration in minutes.

### `POST /doctor/accept/{appointment_id}`
- **Description:** Doctor accepts patient. Status transitions to `in_consultation`. Generates WebRTC room ID and session token.

### `POST /consultations/{appointment_id}/complete`
- **Description:** Finalizes consultation. Records clinical findings, prescription notes, follow-up instructions, and hospital referral if required. Sets appointment status to `completed`.

---

## 8. Medical AI Chatbot (`/chat`)

### `POST /chat/message`
- **Description:** Multilingual conversational assistant supporting optional visible image attachments. Enforces emergency red-flag triggers and cancer diagnostic barriers.

---

## 9. District Reports & Audit (`/reports` & `/audit`)

### `GET /reports/district-analytics`
- **Description:** Real SQL aggregate metrics: screening volume by category, review backlog, arrival rates, wait times, and SMS delivery rates.

### `GET /audit/events`
- **Description:** Administrative audit event trail with actor names, actions, target entities, and timestamps.
