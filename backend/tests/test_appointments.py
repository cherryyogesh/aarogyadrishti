def test_appointment_booking_and_doctor_flow(client, chw_token, doctor_token):
    # 1. Book an appointment for 14:00
    book_resp = client.post(
        "/api/v1/appointments",
        json={
            "patient_id": 1,
            "phc_id": 1,
            "doctor_id": 3,
            "scheduled_date": "2026-11-10",
            "scheduled_time": "14:00",
            "appointment_type": "telemedicine"
        },
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert book_resp.status_code == 201, book_resp.text
    apt_data = book_resp.json()
    apt_id = apt_data["id"]
    # Check 30-min prior arrival time calculation
    assert apt_data["expected_arrival_time"] == "13:30"
    assert apt_data["status"] == "scheduled"

    # 2. Prevent conflicting double-booking for same doctor at 14:00
    conflict_resp = client.post(
        "/api/v1/appointments",
        json={
            "patient_id": 2,
            "phc_id": 1,
            "doctor_id": 3,
            "scheduled_date": "2026-11-10",
            "scheduled_time": "14:00",
            "appointment_type": "telemedicine"
        },
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert conflict_resp.status_code == 400
    assert "Doctor already has an active appointment" in conflict_resp.json()["detail"]

    # 3. Check doctor waiting queue (appointment 1 from seed is in waiting_for_doctor)
    queue_resp = client.get(
        "/api/v1/doctor/waiting-queue",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert queue_resp.status_code == 200
    queue = queue_resp.json()
    assert len(queue) > 0

    # 4. Doctor accepts appointment 1
    accept_resp = client.post(
        f"/api/v1/doctor/accept/{queue[0]['appointment_id']}",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert accept_resp.status_code == 200, accept_resp.text
    acc_data = accept_resp.json()
    assert "session_token" in acc_data
    assert "webrtc_room_id" in acc_data

    # 5. Doctor finalizes consultation
    complete_resp = client.post(
        f"/api/v1/consultations/{queue[0]['appointment_id']}/complete",
        json={
            "clinical_findings": "Erythematous macular rash on left forearm. Consistent with contact dermatitis.",
            "prescription_notes": "Calamine lotion twice daily for 5 days. Cetirizine 10mg once at night if severe itching.",
            "follow_up_instructions": "Review at PHC in 1 week if no improvement.",
            "referral_needed": False
        },
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "completed"
