def test_health_check(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"

def test_login_success(client):
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "chw@aarogya.gov.in",
        "password": "ChwPass@2026"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "chw"
    assert data["username"] == "chw_sarala"

def test_login_invalid_password(client):
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "chw@aarogya.gov.in",
        "password": "WrongPassword123"
    })
    assert resp.status_code == 401
    assert "Incorrect username or password" in resp.json()["detail"]

def test_role_authorization_guard(client, chw_token, admin_token):
    # CHW trying to access admin audit logs must be forbidden (HTTP 403)
    resp = client.get(
        "/api/v1/audit/events",
        headers={"Authorization": f"Bearer {chw_token}"}
    )
    assert resp.status_code == 403
    assert "lacks sufficient privileges" in resp.json()["detail"]

    # Admin accessing audit logs succeeds (HTTP 200)
    resp_admin = client.get(
        "/api/v1/audit/events",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp_admin.status_code == 200
    assert isinstance(resp_admin.json(), list)
