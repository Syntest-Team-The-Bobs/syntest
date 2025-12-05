from pathlib import Path
import os
import pytest
from flask import Flask
from app import app as flask_app
from uuid import uuid4
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash
from models import Participant, db


@pytest.fixture(scope="session")
def app():
    # Use a separate SQLite file under instance for tests
    instance_dir = Path(__file__).resolve().parents[2] / "instance"
    instance_dir.mkdir(exist_ok=True)
    test_db_path = instance_dir / "test.sqlite"
    flask_app.config.update(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{test_db_path}",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "SECRET_KEY": "test-secret",
        }
    )
    with flask_app.app_context():
        db.drop_all()
        db.create_all()
    yield flask_app
    with flask_app.app_context():
        db.session.remove()
        db.drop_all()
    try:
        os.remove(test_db_path)
    except OSError:
        pass


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def db_session(app):
    with app.app_context():
        yield db.session
        db.session.rollback()


# ==============================
# Participant Fixtures Factory
# ==============================
@pytest.fixture()
def participant_factory(db_session):
    def _create(**overrides):
        p = Participant(
            name=overrides.get("name", "Test User"),
            email=overrides.get("email", f"user{uuid4().hex[:8]}@example.com"),
            password_hash=generate_password_hash(
                overrides.get("password", "Passw0rd!")
            ),
            age=overrides.get("age", 30),
            country=overrides.get("country", "Spain"),
        )
        # Allow forcing participant_id if your model supports it
        if "participant_id" in overrides and hasattr(p, "participant_id"):
            setattr(p, "participant_id", overrides["participant_id"])
        db_session.add(p)
        db_session.commit()
        return p

    return _create


@pytest.fixture()
def client_logged_out(client):
    return client


@pytest.fixture()
def client_logged_in(client, participant_factory):
    user = participant_factory()
    with client.session_transaction() as sess:
        sess["user_id"] = user.id
        sess["user_role"] = "participant"
        sess["user_name"] = user.name
    return client, user


@pytest.fixture()
def client_logged_in_screened(client_logged_in):
    client, user = client_logged_in
    # Mark as screened if your schema supports it; otherwise no-op
    updated = False
    if hasattr(user, "screening_completed"):
        user.screening_completed = True
        db.session.commit()
        updated = True
    try:
        # Optional: if you have a ScreeningResult model
        from models import ScreeningResult  # type: ignore

        sr = ScreeningResult(
            participant_id=user.id,
            passed=True,
            score=100,
            created_at=datetime.now(timezone.utc),
        )
        db.session.add(sr)
        db.session.commit()
        updated = True
    except Exception:
        pass
    return client, user
