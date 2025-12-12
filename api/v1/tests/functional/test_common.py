"""
Tests for common.py - Authentication and user management functions.

These tests cover:
- Signup (participant and researcher)
- Login
- Logout
- Get current user
"""



class TestSignup:
    """Test signup functionality."""

    def test_signup_participant_success(self, client, app):
        """Test successful participant signup."""
        with app.app_context():
            response = client.post(
                "/api/v1/auth/signup",
                json={
                    "name": "Test User",
                    "email": "newuser@test.com",
                    "password": "password123",
                    "confirmPassword": "password123",
                    "role": "participant",
                    "age": 25,
                    "country": "USA",
                },
            )
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True

    def test_signup_password_mismatch(self, client, app):
        """Test signup fails when passwords don't match."""
        with app.app_context():
            response = client.post(
                "/api/v1/auth/signup",
                json={
                    "name": "Test User",
                    "email": "mismatch@test.com",
                    "password": "password123",
                    "confirmPassword": "different456",
                    "role": "participant",
                },
            )
            assert response.status_code == 400
            data = response.get_json()
            assert "Passwords do not match" in data["error"]

    def test_signup_duplicate_email(self, client, app, sample_participant):
        """Test signup fails for duplicate email."""
        with app.app_context():
            response = client.post(
                "/api/v1/auth/signup",
                json={
                    "name": "Another User",
                    "email": sample_participant.email,
                    "password": "password123",
                    "confirmPassword": "password123",
                    "role": "participant",
                },
            )
            assert response.status_code == 400
            data = response.get_json()
            assert "already registered" in data["error"]

    def test_signup_researcher_invalid_code(self, client, app):
        """Test researcher signup fails with invalid access code."""
        with app.app_context():
            response = client.post(
                "/api/v1/auth/signup",
                json={
                    "name": "Dr. Test",
                    "email": "researcher@test.com",
                    "password": "password123",
                    "confirmPassword": "password123",
                    "role": "researcher",
                    "accessCode": "WRONGCODE",
                    "institution": "Test University",
                },
            )
            assert response.status_code == 400
            data = response.get_json()
            assert "Invalid researcher access code" in data["error"]

    def test_signup_researcher_valid_code(self, client, app):
        """Test researcher signup succeeds with valid access code."""
        with app.app_context():
            response = client.post(
                "/api/v1/auth/signup",
                json={
                    "name": "Dr. Valid",
                    "email": "validresearcher@test.com",
                    "password": "password123",
                    "confirmPassword": "password123",
                    "role": "researcher",
                    "accessCode": "RESEARCH2025",
                    "institution": "Test University",
                },
            )
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True

    def test_signup_no_data(self, client, app):
        """Test signup fails with no data."""
        with app.app_context():
            response = client.post(
                "/api/v1/auth/signup",
                data="",
                content_type="application/json",
            )
            # Should return error (400 or 500 depending on handling)
            assert response.status_code in [400, 500]


class TestLogin:
    """Test login functionality."""

    def test_login_success(self, client, app, sample_participant):
        """Test successful login."""
        with app.app_context():
            response = client.post(
                "/api/v1/auth/login",
                json={
                    "email": sample_participant.email,
                    "password": "password123",
                    "role": "participant",
                },
            )
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert data["user"]["email"] == sample_participant.email

    def test_login_wrong_password(self, client, app, sample_participant):
        """Test login fails with wrong password."""
        with app.app_context():
            response = client.post(
                "/api/v1/auth/login",
                json={
                    "email": sample_participant.email,
                    "password": "wrongpassword",
                    "role": "participant",
                },
            )
            assert response.status_code == 401
            data = response.get_json()
            assert "Invalid email or password" in data["error"]

    def test_login_nonexistent_user(self, client, app):
        """Test login fails for nonexistent user."""
        with app.app_context():
            response = client.post(
                "/api/v1/auth/login",
                json={
                    "email": "nonexistent@test.com",
                    "password": "password123",
                    "role": "participant",
                },
            )
            assert response.status_code == 401

    def test_login_missing_fields(self, client, app):
        """Test login fails with missing fields."""
        with app.app_context():
            response = client.post(
                "/api/v1/auth/login",
                json={"email": "test@test.com"},
            )
            assert response.status_code == 400
            data = response.get_json()
            assert "required" in data["error"]


class TestLogout:
    """Test logout functionality."""

    def test_logout_clears_session(self, client, app, auth_participant):
        """Test logout clears session."""
        with app.app_context():
            response = client.post("/api/v1/auth/logout")
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True


class TestGetCurrentUser:
    """Test get current user functionality."""

    def test_get_current_user_authenticated(self, client, app, auth_participant):
        """Test get current user when authenticated."""
        with app.app_context():
            response = client.get("/api/v1/auth/me")
            assert response.status_code == 200
            data = response.get_json()
            assert data["id"] == auth_participant.id
            assert data["role"] == "participant"

    def test_get_current_user_not_authenticated(self, client, app):
        """Test get current user returns 401 when not authenticated."""
        with app.app_context():
            response = client.get("/api/v1/auth/me")
            assert response.status_code == 401
            data = response.get_json()
            assert "Not authenticated" in data["error"]

    def test_get_current_user_researcher(self, client, app, auth_researcher):
        """Test get current user for researcher."""
        with app.app_context():
            response = client.get("/api/v1/auth/me")
            assert response.status_code == 200
            data = response.get_json()
            assert data["id"] == auth_researcher.id
            assert data["role"] == "researcher"
