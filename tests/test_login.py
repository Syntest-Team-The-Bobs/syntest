import pytest
import sys
import os
from flask import Flask

# ensure app is importable
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app  # noqa

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_login_page_loads(client):
    """Check that /login route returns 200."""
    response = client.get('/login')
    assert response.status_code == 200


def test_login_with_invalid_credentials(client):
    """Submitting wrong login should show an error message."""
    response = client.post('/login', data={
        'email': 'wrong@example.com',
        'password': 'wrongpassword'
    }, follow_redirects=True)
    assert b'Invalid' in response.data or b'error' in response.data.lower()
