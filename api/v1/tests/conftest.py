"""
Pytest configuration and shared fixtures for SYNTEST backend tests
Provides: app, client, database, authentication fixtures
"""

import pytest
import os
import tempfile
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash

# Import Flask app and models
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app as flask_app
from models import (
    db,
    Participant,
    Researcher,
    Test,
    ColorStimulus,
    ColorTrial,
    ScreeningSession
)


@pytest.fixture(scope='session')
def app():
    """Create and configure a test Flask application"""
    # Create a temporary database
    db_fd, db_path = tempfile.mkstemp()
    
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    flask_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    flask_app.config['SECRET_KEY'] = 'test-secret-key'
    flask_app.config['WTF_CSRF_ENABLED'] = False
    
    # Create tables
    with flask_app.app_context():
        db.create_all()
    
    yield flask_app
    
    # Cleanup
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture(scope='function')
def client(app):
    """Create a test client for the app"""
    return app.test_client()


@pytest.fixture(scope='function')
def runner(app):
    """Create a test CLI runner"""
    return app.test_cli_runner()


@pytest.fixture(scope='function')
def init_database(app):
    """Initialize database for each test"""
    with app.app_context():
        db.create_all()
        yield db
        db.session.remove()
        db.drop_all()


@pytest.fixture(autouse=True)
def setup_database(app):
    """Automatically setup and teardown database for each test"""
    with app.app_context():
        db.create_all()
        yield
        db.session.remove()
        db.drop_all()


@pytest.fixture
def sample_participant(app):
    """Create a sample participant for testing"""
    with app.app_context():
        participant = Participant(
            participant_id='P_TEST_001',
            name='Test Participant',
            email='test@example.com',
            password_hash=generate_password_hash('password123'),
            age=25,
            country='USA',
            screening_completed=False,
            status='active'
        )
        db.session.add(participant)
        db.session.commit()
        
        # Refresh to get the ID
        db.session.refresh(participant)
        participant_id = participant.id
        
        yield participant
        
        # Cleanup handled by setup_database fixture


@pytest.fixture
def sample_researcher(app):
    """Create a sample researcher for testing"""
    with app.app_context():
        researcher = Researcher(
            name='Dr. Test',
            email='researcher@example.com',
            password_hash=generate_password_hash('research123'),
            institution='Test University'
        )
        db.session.add(researcher)
        db.session.commit()
        
        db.session.refresh(researcher)
        
        yield researcher


@pytest.fixture
def sample_test(app):
    """Create a sample test for testing"""
    with app.app_context():
        test = Test(
            name='Grapheme-Color Test',
            description='Tests grapheme-color synesthesia',
            synesthesia_type='Grapheme-Color',
            duration=15
        )
        db.session.add(test)
        db.session.commit()
        
        db.session.refresh(test)
        
        yield test


@pytest.fixture
def sample_color_stimulus(app, sample_researcher):
    """Create a sample color stimulus for testing"""
    with app.app_context():
        stimulus = ColorStimulus(
            set_id=1,
            description='Red color',
            owner_researcher_id=sample_researcher.id,
            family='color',
            r=255,
            g=0,
            b=0,
            trigger_type='letter'
        )
        db.session.add(stimulus)
        db.session.commit()
        
        db.session.refresh(stimulus)
        
        yield stimulus


@pytest.fixture
def multiple_stimuli(app, sample_researcher):
    """Create multiple color stimuli for testing"""
    with app.app_context():
        stimuli = []
        colors = [
            (255, 0, 0, 'A'),    # Red
            (0, 255, 0, 'B'),    # Green
            (0, 0, 255, 'C'),    # Blue
            (255, 255, 0, 'D'),  # Yellow
            (255, 0, 255, 'E'),  # Magenta
        ]
        
        for idx, (r, g, b, letter) in enumerate(colors, 1):
            stimulus = ColorStimulus(
                set_id=1,
                description=f'Color for {letter}',
                owner_researcher_id=sample_researcher.id,
                family='color',
                r=r,
                g=g,
                b=b,
                trigger_type=letter
            )
            stimuli.append(stimulus)
            db.session.add(stimulus)
        
        db.session.commit()
        
        # Refresh all
        for s in stimuli:
            db.session.refresh(s)
        
        yield stimuli


@pytest.fixture
def sample_color_trial(app, sample_participant, sample_color_stimulus):
    """Create a sample color trial for testing"""
    with app.app_context():
        trial = ColorTrial(
            participant_id=sample_participant.participant_id,
            stimulus_id=sample_color_stimulus.id,
            trial_index=1,
            selected_r=255,
            selected_g=0,
            selected_b=0,
            response_ms=1200,
            meta_json={'test_type': 'letter', 'stimulus': 'A'}
        )
        db.session.add(trial)
        db.session.commit()
        
        db.session.refresh(trial)
        
        yield trial


# FIXED: Auth fixtures now properly set up client sessions
@pytest.fixture
def auth_participant(client, sample_participant):
    """Authenticate a participant (set session) - RETURNS PARTICIPANT"""
    with client.session_transaction() as sess:
        sess['user_id'] = sample_participant.id
        sess['user_role'] = 'participant'
    
    return sample_participant  # Return participant so tests can use it


@pytest.fixture
def auth_researcher(client, sample_researcher):
    """Authenticate a researcher (set session) - RETURNS RESEARCHER"""
    with client.session_transaction() as sess:
        sess['user_id'] = sample_researcher.id
        sess['user_role'] = 'researcher'
    
    return sample_researcher  # Return researcher so tests can use it


# NEW: Additional auth fixtures for functional tests
@pytest.fixture
def client_logged_out(client):
    """Client with NO authentication"""
    with client.session_transaction() as sess:
        sess.clear()
    return client


@pytest.fixture
def client_logged_in(client, sample_participant):
    """Client with authenticated participant session - RETURNS (client, user) tuple"""
    with client.session_transaction() as sess:
        sess['user_id'] = sample_participant.id
        sess['user_role'] = 'participant'
    return (client, sample_participant)  # Return tuple for unpacking


@pytest.fixture
def client_logged_in_screened(client, sample_participant, completed_screening):
    """Client with authenticated participant who completed screening - RETURNS (client, user) tuple"""
    with client.session_transaction() as sess:
        sess['user_id'] = sample_participant.id
        sess['user_role'] = 'participant'
    return (client, sample_participant)  # Return tuple for unpacking


@pytest.fixture
def completed_screening(app, sample_participant):
    """Create a completed screening session"""
    with app.app_context():
        session_obj = ScreeningSession(
            participant_id=sample_participant.id,
            status='completed',
            consent_given=True,
            eligible=True,
            selected_types=['Grapheme-Color'],
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc)
        )
        db.session.add(session_obj)
        db.session.commit()
        
        db.session.refresh(session_obj)
        
        yield session_obj


@pytest.fixture
def sample_trials_batch(app, sample_participant):
    """Create a batch of color trials"""
    with app.app_context():
        trials = []
        for i in range(10):
            trial = ColorTrial(
                participant_id=sample_participant.participant_id,
                trial_index=i + 1,
                selected_r=(i * 25) % 256,
                selected_g=(i * 50) % 256,
                selected_b=(i * 75) % 256,
                response_ms=800 + (i * 100),
                meta_json={'trial_set': 'batch_1'}
            )
            trials.append(trial)
            db.session.add(trial)
        
        db.session.commit()
        
        for t in trials:
            db.session.refresh(t)
        
        yield trials


# Helper functions for tests

def create_participant(name='Test User', email='test@test.com'):
    """Helper to create a participant"""
    participant = Participant(
        name=name,
        email=email,
        password_hash=generate_password_hash('password'),
        age=25,
        country='USA'
    )
    db.session.add(participant)
    db.session.commit()
    return participant


def create_trial(participant_id, r=128, g=128, b=128, trial_index=1):
    """Helper to create a color trial"""
    trial = ColorTrial(
        participant_id=participant_id,
        trial_index=trial_index,
        selected_r=r,
        selected_g=g,
        selected_b=b,
        response_ms=1000
    )
    db.session.add(trial)
    db.session.commit()
    return trial