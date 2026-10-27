def test_otp_request_and_verify_flow(client, chw_token):
    # 1. Request OTP for patient AD-10022
    resp = client.post(
        "/api/v1/otp/request",
        json={"patient_id_display": "AD-10022"},
        headers={"Authorization": f"Bearer {chw_token}"}
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert "dev_otp_preview" in data
    apt_id = data["appointment_id"]
    valid_code = data["dev_otp_preview"]

    # 2. Test Invalid Code
    fail_resp = client.post(
        "/api/v1/otp/verify",
        json={"appointment_id": apt_id, "otp_code": "000000"},
        headers={"Authorization": f"Bearer {chw_token}"}
    )
    assert fail_resp.status_code == 400
    assert "Incorrect verification code" in fail_resp.json()["detail"]

    # 3. Test Valid Code Verification
    success_resp = client.post(
        "/api/v1/otp/verify",
        json={"appointment_id": apt_id, "otp_code": valid_code},
        headers={"Authorization": f"Bearer {chw_token}"}
    )
    assert success_resp.status_code == 200, success_resp.text
    assert success_resp.json()["status"] == "waiting_for_doctor"

def test_otp_cooldown_enforcement(client, chw_token, doctor_token):
    # Book a fresh appointment for patient AD-10023
    book = client.post(
        "/api/v1/appointments",
        json={
            "patient_id": 3,
            "phc_id": 1,
            "scheduled_date": "2026-11-12",
            "scheduled_time": "10:00",
            "appointment_type": "telemedicine"
        },
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    assert book.status_code == 201
    apt_id = book.json()["id"]

    # First OTP request
    req1 = client.post(
        "/api/v1/otp/request",
        json={"patient_id_display": "AD-10023", "appointment_id": apt_id},
        headers={"Authorization": f"Bearer {chw_token}"}
    )
    assert req1.status_code == 200

    # Second OTP request immediately after must trigger 429 cooldown
    req2 = client.post(
        "/api/v1/otp/request",
        json={"patient_id_display": "AD-10023", "appointment_id": apt_id},
        headers={"Authorization": f"Bearer {chw_token}"}
    )
    assert req2.status_code == 429
    assert "cooldown active" in req2.json()["detail"]
