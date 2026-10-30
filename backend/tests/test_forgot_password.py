def test_forgot_password_invalid_phone(client):
    resp = client.post("/api/v1/auth/forgot-password/request-otp", json={
        "phone": "123"
    })
    assert resp.status_code == 400
    assert "10-digit mobile number" in resp.json()["detail"]

def test_forgot_password_unknown_phone(client):
    resp = client.post("/api/v1/auth/forgot-password/request-otp", json={
        "phone": "9999999999"
    })
    assert resp.status_code == 404
    assert "No registered healthcare account found" in resp.json()["detail"]

def test_forgot_password_complete_flow(client):
    # 1. Request OTP for chw_sarala (phone: +91 98480 11001)
    req_resp = client.post("/api/v1/auth/forgot-password/request-otp", json={
        "phone": "9848011001"
    })
    assert req_resp.status_code == 200
    data = req_resp.json()
    assert data["success"] is True
    assert "masked_phone" in data
    assert "demo_otp" in data
    otp_code = data["demo_otp"]
    assert len(otp_code) == 6

    # 2. Test password mismatch
    mismatch_resp = client.post("/api/v1/auth/forgot-password/reset", json={
        "phone": "9848011001",
        "otp_code": otp_code,
        "new_password": "NewSecretPass123",
        "confirm_password": "DifferentSecretPass"
    })
    assert mismatch_resp.status_code == 400
    assert "do not match" in mismatch_resp.json()["detail"]

    # 3. Test wrong OTP
    wrong_otp_resp = client.post("/api/v1/auth/forgot-password/reset", json={
        "phone": "9848011001",
        "otp_code": "000000",
        "new_password": "NewSecretPass123",
        "confirm_password": "NewSecretPass123"
    })
    assert wrong_otp_resp.status_code == 400
    assert "Invalid OTP code" in wrong_otp_resp.json()["detail"]

    # 4. Valid OTP & matching new password
    reset_resp = client.post("/api/v1/auth/forgot-password/reset", json={
        "phone": "9848011001",
        "otp_code": otp_code,
        "new_password": "BrandNewPassword@2026",
        "confirm_password": "BrandNewPassword@2026"
    })
    assert reset_resp.status_code == 200
    reset_data = reset_resp.json()
    assert reset_data["success"] is True
    assert "Password reset successfully" in reset_data["message"]

    # 5. Sign in with the brand new password!
    login_resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "9848011001",
        "password": "BrandNewPassword@2026"
    })
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()
    assert login_resp.json()["username"] == "chw_sarala"
