import pytest
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app  # noqa

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_signup_page_loads(client):
    """Check that /signup route returns 200."""
    response = client.get('/signup')
    assert response.status_code == 200


def test_signup_with_mismatched_passwords(client):
    """Signup should fail if passwords don't match."""
    response = client.post('/signup', data={
        'email': 'test@example.com',
        'password': 'pass1',
        'confirm_password': 'pass2'
    }, follow_redirects=True)
    assert b'mismatch' in response.data or b'error' in response.data.lower()
