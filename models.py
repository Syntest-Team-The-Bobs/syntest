from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# ======================================================
# CORE USER & TEST MODELS (from auth-routes)
# ======================================================

class Participant(db.Model):
    """Model for study participants"""
    __tablename__ = 'participants'

    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    age = db.Column(db.Integer)
    country = db.Column(db.String(100))

    screening_completed = db.Column(db.Boolean, default=False)
    synesthesia_type = db.Column(db.String(100))
    status = db.Column(db.String(50), default='active')

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    # Relationships
    test_results = db.relationship('TestResult', backref='participant', lazy=True)
    screenings = db.relationship('ScreeningResponse', backref='participant', lazy=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.participant_id:
            self.participant_id = f"P{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    def __repr__(self):
        return f'<Participant {self.participant_id}>'


class Researcher(db.Model):
    """Model for researchers"""
    __tablename__ = 'researchers'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    institution = db.Column(db.String(200))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    def __repr__(self):
        return f'<Researcher {self.email}>'


class Test(db.Model):
    """Model for general synesthesia test types"""
    __tablename__ = 'tests'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    synesthesia_type = db.Column(db.String(100))
    duration = db.Column(db.Integer)  # in minutes

    results = db.relationship('TestResult', backref='test', lazy=True)

    def __repr__(self):
        return f'<Test {self.name}>'


class TestResult(db.Model):
    """Model for test results"""
    __tablename__ = 'test_results'

    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(db.Integer, db.ForeignKey('participants.id'), nullable=False)
    test_id = db.Column(db.Integer, db.ForeignKey('tests.id'), nullable=False)

    status = db.Column(db.String(50), default='not_started')  # not_started, in_progress, completed
    consistency_score = db.Column(db.Float)
    result_data = db.Column(db.JSON)

    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)

    def __repr__(self):
        return f'<TestResult P:{self.participant_id} T:{self.test_id}>'


class ScreeningResponse(db.Model):
    """Model for screening questionnaire responses"""
    __tablename__ = 'screening_responses'

    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(db.Integer, db.ForeignKey('participants.id'), nullable=False)

    responses = db.Column(db.JSON)
    eligible = db.Column(db.Boolean)
    recommended_tests = db.Column(db.JSON)
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<ScreeningResponse {self.participant_id}>'


# ======================================================
# COLOR TEST MODELS (from main)
# ======================================================

class ColorStimulus(db.Model):
    """Stimuli table for color-based tests"""
    __tablename__ = "color_stimuli"

    id = db.Column(db.Integer, primary_key=True)
    set_id = db.Column(db.Integer, nullable=True, index=True)
    description = db.Column(db.String(255), nullable=True)
    owner_researcher_id = db.Column(db.Integer, nullable=True, index=True)
    family = db.Column(db.String(32), nullable=False, default="color")
    r = db.Column(db.Integer, nullable=False)
    g = db.Column(db.Integer, nullable=False)
    b = db.Column(db.Integer, nullable=False)
    trigger_type = db.Column(db.String(64), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "set_id": self.set_id,
            "description": self.description,
            "owner_researcher_id": self.owner_researcher_id,
            "family": self.family,
            "r": self.r,
            "g": self.g,
            "b": self.b,
            "hex": f"#{self.r:02x}{self.g:02x}{self.b:02x}",
            "trigger_type": self.trigger_type,
        }


class ColorTrial(db.Model):
    """Individual color test trial results"""
    __tablename__ = "color_trials"

    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(db.String(64), nullable=True, index=True)

    stimulus_id = db.Column(
        db.Integer,
        db.ForeignKey("color_stimuli.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    stimulus = db.relationship("ColorStimulus", lazy="joined")

    trial_index = db.Column(db.Integer, nullable=True)
    selected_r = db.Column(db.Integer, nullable=True)
    selected_g = db.Column(db.Integer, nullable=True)
    selected_b = db.Column(db.Integer, nullable=True)
    response_ms = db.Column(db.Integer, nullable=True)
    meta_json = db.Column(db.JSON, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "participant_id": self.participant_id,
            "stimulus_id": self.stimulus_id,
            "trial_index": self.trial_index,
            "selected_r": self.selected_r,
            "selected_g": self.selected_g,
            "selected_b": self.selected_b,
            "response_ms": self.response_ms,
            "meta_json": self.meta_json or {},
            "created_at": self.created_at.isoformat(),
        }


class TestData(db.Model):
    """Aggregated color test metrics (CCT/SCT results)"""
    __tablename__ = "test_data"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(64), index=True, nullable=True)
    test_id = db.Column(db.Integer, nullable=True, index=True)
    owner_researcher_id = db.Column(db.Integer, nullable=True, index=True)
    session_id = db.Column(db.Integer, nullable=True, index=True)

    stimulus_id = db.Column(
        db.Integer,
        db.ForeignKey("color_stimuli.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    stimulus = db.relationship("ColorStimulus", backref="test_data")

    test_type = db.Column(db.String(64), nullable=True)
    stimulus_type = db.Column(db.String(64), nullable=True)
    family = db.Column(db.String(16), nullable=False, default="color")
    locale = db.Column(db.String(16), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    trial = db.Column(db.Integer, nullable=True)
    cct_cutoff = db.Column(db.Float, nullable=True)
    cct_triggers = db.Column(db.Integer, nullable=True)
    cct_trials_per_trigger = db.Column(db.Integer, nullable=True)
    cct_valid = db.Column(db.Integer, nullable=True)

    cct_none_pct = db.Column(db.Float, nullable=True)
    cct_rt_mean = db.Column(db.Integer, nullable=True)
    cct_mean = db.Column(db.Float, nullable=True)
    cct_std = db.Column(db.Float, nullable=True)
    cct_median = db.Column(db.Float, nullable=True)

    cct_per_trigger = db.Column(db.JSON, nullable=True)
    cct_pairwise = db.Column(db.JSON, nullable=True)
    cct_pass = db.Column(db.Boolean, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "test_id": self.test_id,
            "owner_researcher_id": self.owner_researcher_id,
            "session_id": self.session_id,
            "stimulus_id": self.stimulus_id,
            "test_type": self.test_type,
            "stimulus_type": self.stimulus_type,
            "family": self.family,
            "locale": self.locale,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "trial": self.trial,
            "cct_cutoff": self.cct_cutoff,
            "cct_triggers": self.cct_triggers,
            "cct_trials_per_trigger": self.cct_trials_per_trigger,
            "cct_valid": self.cct_valid,
            "cct_none_pct": self.cct_none_pct,
            "cct_rt_mean": self.cct_rt_mean,
            "cct_mean": self.cct_mean,
            "cct_std": self.cct_std,
            "cct_median": self.cct_median,
            "cct_per_trigger": self.cct_per_trigger,
            "cct_pairwise": self.cct_pairwise,
            "cct_pass": self.cct_pass,
        }
