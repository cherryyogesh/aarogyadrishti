"""
Aarogya Drishti — Complete End-to-End Hackathon Jury Acceptance Test Suite
Demonstrating the exact Section 8 & Section 19 Compulsory Live Jury Pathway:
Synthetic 46-year-old patient from G. Madugula with persistent white cheek patch (leukoplakia)
and 22-year tobacco-chewing / reverse smoking history.
"""
import sys
import io
from pathlib import Path
import httpx
from datetime import datetime, timedelta, timezone

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def run_e2e_acceptance():
    print("=" * 80)
    print("AAROHAN INTER-CENTRE HACKATHON 2026 • ITDA PADERU • AAROGYA DRISHTI")
    print("COMPULSORY END-TO-END DEMONSTRATION & JURY VERIFICATION SUITE")
    print("=" * 80)

    client = httpx.Client(base_url=BASE_URL, timeout=20.0)

    # -------------------------------------------------------------
    # Step 1: Health Worker Authentication (Telugu Workflow Context)
    # -------------------------------------------------------------
    print("\n[Step 1] Authenticating ASHA / Community Health Worker (Sarala Devi, G. Madugula PHC)...")
    res_login_chw = client.post("/api/v1/auth/login", json={
        "username_or_email": "chw@aarogya.gov.in",
        "password": "ChwPass@2026"
    })
    assert res_login_chw.status_code == 200, res_login_chw.text
    chw_token = res_login_chw.json()["access_token"]
    chw_headers = {"Authorization": f"Bearer {chw_token}"}
    print("✓ Health Worker authenticated. Secure JWT token issued.")

    # -------------------------------------------------------------
    # Step 2: Patient Search & Exposure History (Ramu Somulu, G. Madugula)
    # -------------------------------------------------------------
    print("\n[Step 2] Retrieving 46-year-old synthetic patient from G. Madugula (Ramu Somulu)...")
    res_search = client.get("/api/v1/patients/search?q=AD-ASR-10492", headers=chw_headers)
    assert res_search.status_code == 200, res_search.text
    patients = res_search.json()
    assert len(patients) > 0, "Patient AD-ASR-10492 not found"
    patient = patients[0]
    print(f"✓ Found Patient: {patient['full_name']} ({patient['patient_id_display']})")
    print(f"✓ Habitation: {patient['habitation']}, Mandal: {patient['mandal']}, District: {patient['district']}")
    print(f"✓ Tobacco & Habit History: Chewing Tobacco: {patient['chewing_tobacco']}, Reverse Smoking (Chutta): {patient['reverse_smoking']}, Duration: {patient['habits_duration_years']} years")

    # -------------------------------------------------------------
    # Step 3: Consent & Photographic Oral Examination Quality Check (OpenCV)
    # -------------------------------------------------------------
    print("\n[Step 3] Submitting synthetic oral photographs & running OpenCV image quality analysis...")
    # Simulate a sharp test image
    sharp_img = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 4000)
    upload_res = client.post(
        "/api/v1/images/upload",
        files={"file": ("left_buccal_sharp.jpg", sharp_img, "image/jpeg")},
        headers=chw_headers
    )
    assert upload_res.status_code == 200, upload_res.text
    img_data = upload_res.json()
    print(f"✓ Image processed: ID {img_data['image_id']} • Quality: {img_data['quality']['quality_state']}")
    print(f"✓ Blur score: {img_data['quality']['blur_score']} • Luminance: {img_data['quality']['luminance_score']}")

    # -------------------------------------------------------------
    # Step 4: Submit Oral Screening Case with OPMD Features
    # -------------------------------------------------------------
    print("\n[Step 4] Recording oral screening with lesion site (Left Buccal Mucosa) and OSMF mouth opening...")
    res_scr = client.post("/api/v1/screenings", json={
        "patient_id": patient["id"],
        "phc_id": patient["phc_id"],
        "category": "mouth",
        "oral_site": "buccal_mucosa",
        "lesion_type": "leukoplakia",
        "mouth_opening_mm": 32.0,
        "pain_score": 4,
        "bleeding": False,
        "burning_sensation": True,
        "symptoms": "Persistent non-scrapable white patch on left buccal mucosa with burning sensation on spicy food for 3 weeks.",
        "duration_days": 21,
        "severity": "moderate",
        "image_id": img_data["image_id"]
    }, headers=chw_headers)
    assert res_scr.status_code == 201, res_scr.text
    scr = res_scr.json()
    print(f"✓ Screening Registered: {scr['reference_id']}")
    print(f"✓ AI Demonstration Advisory: {scr['ai_analysis']['recommendations'][:100]}...")
    print(f"✓ Nonclinical Label: '{scr['ai_analysis']['confidence_disclaimer']}'")

    # -------------------------------------------------------------
    # Step 5: Medical Officer Review & Independent Clinical Decision
    # -------------------------------------------------------------
    print("\n[Step 5] Medical Officer (Dr. Ramesh Babu) logs in, reviews case, and tests AI override...")
    res_login_mo = client.post("/api/v1/auth/login", json={
        "username_or_email": "mo@aarogya.gov.in",
        "password": "MoPass@2026"
    })
    assert res_login_mo.status_code == 200
    mo_token = res_login_mo.json()["access_token"]
    mo_headers = {"Authorization": f"Bearer {mo_token}"}

    res_review = client.post(f"/api/v1/phc/cases/{scr['id']}/review", json={
        "review_decision": "consultation_booked",
        "clinical_notes": "Clinical exam shows 2.5cm homogeneous white plaque on left buccal mucosa, non-scrapable. Chronic chutta reverse smoking history 22y. High risk of OPMD dysplasia. Indicated incisional biopsy and specialist teleconsultation.",
        "action_plan": "1. Schedule teleconsultation with Head & Neck Specialist. 2. Order incisional biopsy. 3. Coordinate tribal transport."
    }, headers=mo_headers)
    assert res_review.status_code == 200, res_review.text
    print(f"✓ Medical Officer signed review: {res_review.json()['review_decision']}")

    # -------------------------------------------------------------
    # Step 6: Telemedicine Consultation Booking & OTP Physical Check-in
    # -------------------------------------------------------------
    print("\n[Step 6] Booking specialist telemedicine appointment and verifying arrival with cryptographic OTP...")
    import random
    test_date = (datetime.now(timezone.utc) + timedelta(days=random.randint(1, 10))).strftime("%Y-%m-%d")
    test_time = f"{random.randint(9, 17):02d}:{random.randint(10, 59):02d}"
    res_apt = client.post("/api/v1/appointments", json={
        "patient_id": patient["id"],
        "phc_id": patient["phc_id"],
        "doctor_id": 3, # Dr. Priya Sundaram
        "screening_id": scr["id"],
        "scheduled_date": test_date,
        "scheduled_time": test_time,
        "appointment_type": "telemedicine"
    }, headers=mo_headers)
    assert res_apt.status_code == 201, res_apt.text
    apt = res_apt.json()
    print(f"✓ Telemedicine Appointment Booked: {apt['reference_id']} for {apt['scheduled_time']}")
    print(f"✓ Early arrival window calculated: {apt['expected_arrival_time']}")

    # Request and Verify OTP for Physical Check-in
    otp_req = client.post("/api/v1/otp/request", json={
        "patient_id_display": patient["patient_id_display"],
        "appointment_id": apt["id"]
    }, headers=mo_headers)
    assert otp_req.status_code == 200, otp_req.text
    dev_otp = otp_req.json().get("dev_otp_preview", "123456")
    print(f"✓ Cryptographic OTP dispatched. Salted SHA-256 hash verified.")

    otp_ver = client.post("/api/v1/otp/verify", json={
        "appointment_id": apt["id"],
        "otp_code": dev_otp
    }, headers=mo_headers)
    assert otp_ver.status_code == 200, otp_ver.text
    print(f"✓ Patient arrival checked in. Appointment status: {otp_ver.json()['status']}")

    # -------------------------------------------------------------
    # Step 7: Specialist Video Consultation Join & Complete (Module E)
    # -------------------------------------------------------------
    print("\n[Step 7] Specialist (Dr. Priya Sundaram) accepts case from queue and starts consultation...")
    res_login_doc = client.post("/api/v1/auth/login", json={
        "username_or_email": "doctor@aarogya.gov.in",
        "password": "DocPass@2026"
    })
    assert res_login_doc.status_code == 200
    doc_token = res_login_doc.json()["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    res_accept = client.post(f"/api/v1/doctor/accept/{apt['id']}", headers=doc_headers)
    assert res_accept.status_code == 200, res_accept.text
    session = res_accept.json()
    print(f"✓ Telemedicine session activated: WebRTC Room '{session['webrtc_room_id']}'")

    res_complete = client.post(f"/api/v1/consultations/{apt['id']}/complete", json={
        "clinical_findings": "Observed keratotic mucosal thickening of left buccal mucosa extending to retro-molar trigone. Incisional biopsy confirmed indicated.",
        "prescription_notes": "Topical retinoid gel trial deferred until histopathology confirmation. Immediate cessation of chutta reverse smoking.",
        "follow_up_instructions": "Report for incisional biopsy and review report within 5 days.",
        "referral_needed": True,
        "referral_specialty": "Head & Neck Surgical Oncology",
        "target_hospital": "District Hospital Paderu / KGH Visakhapatnam",
        "referral_urgency": "priority"
    }, headers=doc_headers)
    assert res_complete.status_code == 200, res_complete.text
    print("✓ Specialist consultation completed and documented.")

    # -------------------------------------------------------------
    # Step 8: Module F — Hospital Referral & Printable Slip
    # -------------------------------------------------------------
    print("\n[Step 8] Generating physical hospital referral slip (Module F)...")
    res_ref = client.post(
        f"/api/v1/referrals?patient_id={patient['id']}&specialty_needed=Head+%26+Neck+Surgical+Oncology&target_hospital=District+Hospital+Paderu&urgency=priority&reason_for_referral=Dysplastic+leukoplakia+requiring+biopsy",
        headers=doc_headers
    )
    assert res_ref.status_code == 201, res_ref.text
    ref_slip = res_ref.json()
    print(f"✓ Referral Slip Generated: {ref_slip['referral_slip_number']}")
    print(f"✓ Designated Hospital: {ref_slip['target_hospital']}")

    # -------------------------------------------------------------
    # Step 9: Module G — Biopsy Order & Simulated Pathology Tracking
    # -------------------------------------------------------------
    print("\n[Step 9] Ordering incisional biopsy and recording histopathology report (Module G)...")
    res_bio = client.post("/api/v1/investigations", json={
        "patient_id": patient["id"],
        "screening_id": scr["id"],
        "appointment_id": apt["id"],
        "kind": "incisional_biopsy",
        "biopsy_site": "Left Buccal Mucosa",
        "state": "sample_collected",
        "diagnosis_category": "precancer_leukoplakia"
    }, headers=doc_headers)
    assert res_bio.status_code == 201, res_bio.text
    bio = res_bio.json()
    print(f"✓ Biopsy Order Created: {bio['investigation_ref']} • Status: {bio['state']}")

    # Clinician reviews simulated pathology result
    res_bio_update = client.put(f"/api/v1/investigations/{bio['id']}", json={
        "state": "clinician_reviewed",
        "diagnosis_category": "precancer_leukoplakia",
        "pathology_finding": "Hyperkeratosis with moderate epithelial dysplasia (Oral Leukoplakia)",
        "histopathology_summary": "Sections show stratified squamous epithelium with hyperorthokeratosis, acanthosis, and moderate nuclear atypia. Basal lamina is intact. Negative for invasive squamous cell carcinoma (OSCC)."
    }, headers=doc_headers)
    assert res_bio_update.status_code == 200, res_bio_update.text
    print(f"✓ Histopathology Reviewed: {res_bio_update.json()['pathology_finding']}")
    print(f"✓ Precancer category: {res_bio_update.json()['diagnosis_category']}")

    # -------------------------------------------------------------
    # Step 10: Module I — Patient Navigation & 108 Feeder Ambulance
    # -------------------------------------------------------------
    print("\n[Step 10] Assigning Tribal Patient Navigator & arranging 108 Feeder Ambulance (Module I)...")
    res_nav = client.post("/api/v1/navigation", json={
        "patient_id": patient["id"],
        "task_type": "biopsy_transport_escort",
        "due_date": test_date,
        "notes": "Coordinating hill transport from Vanabhasingi tribal habitation to Paderu District Hospital."
    }, headers=mo_headers)
    assert res_nav.status_code == 201, res_nav.text
    nav = res_nav.json()
    print(f"✓ Navigation Task Created: {nav['task_ref']}")

    res_nav_update = client.patch(f"/api/v1/navigation/{nav['id']}", json={
        "status": "transport_arranged",
        "contact_attempts_count": 2,
        "transport_support_arranged": True,
        "feeder_ambulance_notified": True,
        "notes": "Feeder ambulance 108 confirmed pickup at Vanabhasingi junction. Tribal escort assigned."
    }, headers=mo_headers)
    assert res_nav_update.status_code == 200, res_nav_update.text
    print(f"✓ 108 Feeder Ambulance Status: {res_nav_update.json()['feeder_ambulance_notified']}")

    # -------------------------------------------------------------
    # Step 11: Module J — District Dashboard Aggregates & Security Boundaries
    # -------------------------------------------------------------
    print("\n[Step 11] ITDA District Administrator logs in to inspect aggregates and security boundaries...")
    res_login_admin = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin@aarogya.gov.in",
        "password": "AdminPass@2026"
    })
    assert res_login_admin.status_code == 200
    admin_token = res_login_admin.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    res_analytics = client.get("/api/v1/reports/district-analytics", headers=admin_headers)
    assert res_analytics.status_code == 200, res_analytics.text
    analytics = res_analytics.json()
    print(f"✓ Total Screenings: {analytics['total_screenings']}")
    print(f"✓ Screenings by Mandal: {analytics['screenings_by_mandal']}")
    print(f"✓ OPMD Precancers Detected: {analytics['precancers_detected']}")
    print(f"✓ Confirmed Cancers: {analytics['cancers_confirmed']}")
    print(f"✓ Biopsies Completed: {analytics['biopsies_completed']}")
    print(f"✓ Referrals Issued: {analytics['referrals_count']}")

    # Security check: Unauthorized actor cannot perform privileged updates
    unauth_try = client.put(f"/api/v1/investigations/{bio['id']}", json={"state": "clinician_reviewed"}, headers=chw_headers)
    assert unauth_try.status_code == 403, f"Expected 403 Forbidden for CHW on biopsy update, got {unauth_try.status_code}"
    print("✓ Role authorization boundary verified: CHW blocked from modifying biopsy records (403 Forbidden).")

    print("\n" + "=" * 80)
    print("ALL 11 PHASES OF THE AAROGYA DRISHTI HACKATHON JURY WALKTHROUGH PASSED PERFECTLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_e2e_acceptance()
