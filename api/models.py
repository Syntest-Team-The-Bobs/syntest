from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import enum
from sqlalchemy import CheckConstraint, Index
import math

db = SQLAlchemy()

# ======================================================
# CORE USER & TEST MODELS (existing)
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
    # NOTE: screening_sessions backref is created on ScreeningSession.participant relationship below

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
    """Legacy screening questionnaire responses (simple JSON)"""
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
# SCREENING v1 MODELS (additive, normalized)
# ======================================================

class YesNo(enum.Enum):
    yes = "yes"
    no = "no"

class YesNoMaybe(enum.Enum):
    yes = "yes"
    no = "no"
    maybe = "maybe"

class Frequency(enum.Enum):
    yes = "yes"
    sometimes = "sometimes"
    no = "no"


class ScreeningSession(db.Model):
    """
    One row per screening run. Stores overall status/eligibility plus
    denormalized 'selected_types' and 'recommended_tests' for quick reads.
    Normalized per-step answers live in child tables below.
    """
    __tablename__ = "screening_sessions"

    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(
        db.Integer,
        db.ForeignKey("participants.id"),
        nullable=False,
        index=True,
    )

    # lifecycle
    status = db.Column(db.String(20), default="in_progress", index=True)  # in_progress|completed|exited
    exit_code = db.Column(db.String(8), nullable=True, index=True)        # A | BC | D | NONE (or NULL if eligible)
    consent_given = db.Column(db.Boolean, default=False, nullable=False)

    # derived outcome
    eligible = db.Column(db.Boolean, nullable=True)
    selected_types = db.Column(db.JSON, nullable=True)       # e.g., ["Grapheme – Color", "Lexical – Taste"]
    recommended_tests = db.Column(db.JSON, nullable=True)    # list of dicts: {name, reason, test_id?}

    started_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    completed_at = db.Column(db.DateTime)

    # relationships (backref creates participant.screening_sessions)
    participant = db.relationship(
        "Participant",
        backref=db.backref("screening_sessions", lazy=True),
        lazy="joined",
    )
    health = db.relationship(
        "ScreeningHealth",
        backref="session",
        uselist=False,
        cascade="all, delete-orphan",
        lazy=True,
    )
    definition = db.relationship(
        "ScreeningDefinition",
        backref="session",
        uselist=False,
        cascade="all, delete-orphan",
        lazy=True,
    )
    pain_emotion = db.relationship(
        "ScreeningPainEmotion",
        backref="session",
        uselist=False,
        cascade="all, delete-orphan",
        lazy=True,
    )
    type_choice = db.relationship(
        "ScreeningTypeChoice",
        backref="session",
        uselist=False,
        cascade="all, delete-orphan",
        lazy=True,
    )
    events = db.relationship(
        "ScreeningEvent",
        backref="session",
        cascade="all, delete-orphan",
        lazy=True,
    )
    recs = db.relationship(
        "ScreeningRecommendedTest",
        backref="session",
        cascade="all, delete-orphan",
        lazy=True,
    )

    def __repr__(self):
        return f"<ScreeningSession id={self.id} P={self.participant_id} status={self.status} exit={self.exit_code}>"

    # ---------------- Convenience helpers ----------------

    def record_event(self, step: int, event: str, details: dict | None = None):
        self.events.append(ScreeningEvent(step=step, event=event, details=details or {}))
        return self

    def finalize(self):
        """Call when the session is done (or at any decision point)."""
        # Import services here to avoid circular imports
        from services import EligibilityService, RecommendationService, TypeSelectionService
        
        # Use services instead of direct method calls
        EligibilityService.compute_eligibility_and_exit(self)
        if self.eligible:
            RecommendationService.compute_recommendations(self)
            self.status = "completed"
        else:
            self.status = "exited"
        if not self.completed_at:
            self.completed_at = datetime.utcnow()


class ScreeningHealth(db.Model):
    """Step 1 answers."""
    __tablename__ = "screening_health"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("screening_sessions.id"), nullable=False, index=True)

    drug_use = db.Column(db.Boolean, default=False, nullable=False)
    neuro_condition = db.Column(db.Boolean, default=False, nullable=False)
    medical_treatment = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<ScreeningHealth S={self.session_id} drug={self.drug_use} neuro={self.neuro_condition} med={self.medical_treatment}>"


class ScreeningDefinition(db.Model):
    """Step 2 answer."""
    __tablename__ = "screening_definition"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("screening_sessions.id"), nullable=False, index=True)

    answer = db.Column(db.Enum(YesNoMaybe, name="screening_def_enum"), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<ScreeningDefinition S={self.session_id} answer={self.answer.value}>"


class ScreeningPainEmotion(db.Model):
    """Step 3 answer."""
    __tablename__ = "screening_pain_emotion"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("screening_sessions.id"), nullable=False, index=True)

    answer = db.Column(db.Enum(YesNo, name="screening_pe_enum"), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<ScreeningPainEmotion S={self.session_id} answer={self.answer.value}>"


class ScreeningTypeChoice(db.Model):
    """Step 4 answers."""
    __tablename__ = "screening_type_choice"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("screening_sessions.id"), nullable=False, index=True)

    # Note: using the same Enum name for multiple columns is fine; SQLAlchemy reuses the type.
    grapheme = db.Column(db.Enum(Frequency, name="screening_freq_enum"), nullable=True)
    music = db.Column(db.Enum(Frequency, name="screening_freq_enum"), nullable=True)
    lexical = db.Column(db.Enum(Frequency, name="screening_freq_enum"), nullable=True)
    sequence = db.Column(db.Enum(Frequency, name="screening_freq_enum"), nullable=True)
    other = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<ScreeningTypeChoice S={self.session_id}>"


class ScreeningEvent(db.Model):
    """Optional audit trail for clicks/state changes."""
    __tablename__ = "screening_events"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("screening_sessions.id"), nullable=False, index=True)

    step = db.Column(db.Integer, nullable=False)  # 0..5
    event = db.Column(db.String(64), nullable=False)  # e.g., 'consent_checked', 'continue', 'exit'
    details = db.Column(db.JSON, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<ScreeningEvent S={self.session_id} step={self.step} {self.event}>"


class ScreeningRecommendedTest(db.Model):
    """Normalized list of suggested tests for a finished, eligible session."""
    __tablename__ = "screening_recommended_tests"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("screening_sessions.id"), nullable=False, index=True)

    position = db.Column(db.Integer, nullable=False)           # 1-based order shown to the user
    suggested_name = db.Column(db.String(128), nullable=False) # human/lookup name (e.g., 'Grapheme-Color')
    reason = db.Column(db.String(255), nullable=True)

    test_id = db.Column(db.Integer, db.ForeignKey("tests.id"), nullable=True, index=True)
    test = db.relationship("Test", lazy="joined")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<ScreeningRecommendedTest S={self.session_id} {self.suggested_name} pos={self.position}>"


# ======================================================
# COLOR TEST MODELS (IMPROVED & COMPLETE)
# ======================================================

class ColorStimulus(db.Model):
    """Stimuli table for color-based tests"""
    __tablename__ = "color_stimuli"
    __table_args__ = (
        CheckConstraint('r >= 0 AND r <= 255', name='check_r_range'),
        CheckConstraint('g >= 0 AND g <= 255', name='check_g_range'),
        CheckConstraint('b >= 0 AND b <= 255', name='check_b_range'),
        Index('idx_cs_set_owner', 'set_id', 'owner_researcher_id'),
        Index('idx_cs_family_trigger', 'family', 'trigger_type'),
    )

    id = db.Column(db.Integer, primary_key=True)
    set_id = db.Column(db.Integer, nullable=True, index=True)
    description = db.Column(db.String(255), nullable=True)
    
    # Foreign key to Researcher
    owner_researcher_id = db.Column(db.Integer, db.ForeignKey('researchers.id'), nullable=True, index=True)
    owner = db.relationship('Researcher', backref='color_stimuli', lazy='joined')
    
    family = db.Column(db.String(32), nullable=False, default="color", index=True)
    r = db.Column(db.Integer, nullable=False)
    g = db.Column(db.Integer, nullable=False)
    b = db.Column(db.Integer, nullable=False)
    trigger_type = db.Column(db.String(64), nullable=True, index=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships to other tables
    trials = db.relationship("ColorTrial", back_populates="stimulus", lazy="dynamic", cascade="all, delete-orphan")
    test_data_entries = db.relationship("TestData", back_populates="stimulus", lazy="dynamic")
    analyzed_data_entries = db.relationship("AnalyzedTestData", back_populates="stimulus", lazy="dynamic")

    def __repr__(self):
        return f"<ColorStimulus id={self.id} RGB=({self.r},{self.g},{self.b}) trigger={self.trigger_type}>"

    @property
    def hex_color(self):
        """Returns the color as a hex string"""
        return f"#{self.r:02x}{self.g:02x}{self.b:02x}"

    @property
    def rgb_tuple(self):
        """Returns the color as an (r, g, b) tuple"""
        return (self.r, self.g, self.b)

    def distance_to(self, r, g, b):
        """Calculate Euclidean distance to another RGB color"""
        return math.sqrt(
            (self.r - r)**2 +
            (self.g - g)**2 +
            (self.b - b)**2
        )

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
            "hex": self.hex_color,
            "trigger_type": self.trigger_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ColorTrial(db.Model):
    """Individual color test trial results"""
    __tablename__ = "color_trials"
    __table_args__ = (
        CheckConstraint('selected_r >= 0 AND selected_r <= 255', name='check_selected_r_range'),
        CheckConstraint('selected_g >= 0 AND selected_g <= 255', name='check_selected_g_range'),
        CheckConstraint('selected_b >= 0 AND selected_b <= 255', name='check_selected_b_range'),
        CheckConstraint('response_ms >= 0', name='check_response_time_positive'),
        Index('idx_ct_participant_created', 'participant_id', 'created_at'),
        Index('idx_ct_stimulus_trial', 'stimulus_id', 'trial_index'),
    )

    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign key to Participant - using string for now to match your current schema
    # You can change this to Integer + ForeignKey later if needed
    participant_id = db.Column(db.String(64), nullable=False, index=True)
    
    # Foreign key to ColorStimulus
    stimulus_id = db.Column(
        db.Integer,
        db.ForeignKey("color_stimuli.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    stimulus = db.relationship("ColorStimulus", back_populates="trials", lazy="joined")

    # Trial details
    trial_index = db.Column(db.Integer, nullable=True)
    
    # Response data
    selected_r = db.Column(db.Integer, nullable=True)
    selected_g = db.Column(db.Integer, nullable=True)
    selected_b = db.Column(db.Integer, nullable=True)
    response_ms = db.Column(db.Integer, nullable=True)
    
    # Metadata (device info, browser, etc.)
    meta_json = db.Column(db.JSON, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f"<ColorTrial id={self.id} P={self.participant_id} trial={self.trial_index}>"

    @property
    def selected_hex_color(self):
        """Returns the selected color as a hex string"""
        if all(v is not None for v in [self.selected_r, self.selected_g, self.selected_b]):
            return f"#{self.selected_r:02x}{self.selected_g:02x}{self.selected_b:02x}"
        return None

    @property
    def selected_rgb_tuple(self):
        """Returns the selected color as an (r, g, b) tuple"""
        if all(v is not None for v in [self.selected_r, self.selected_g, self.selected_b]):
            return (self.selected_r, self.selected_g, self.selected_b)
        return None

    def color_distance(self):
        """Calculate Euclidean distance between stimulus and selected colors"""
        if self.stimulus and all(v is not None for v in [self.selected_r, self.selected_g, self.selected_b]):
            return self.stimulus.distance_to(self.selected_r, self.selected_g, self.selected_b)
        return None

    def is_exact_match(self):
        """Check if selected color exactly matches stimulus"""
        if self.stimulus and all(v is not None for v in [self.selected_r, self.selected_g, self.selected_b]):
            return (
                self.stimulus.r == self.selected_r and
                self.stimulus.g == self.selected_g and
                self.stimulus.b == self.selected_b
            )
        return False

    def is_close_match(self, threshold=30):
        """Check if selected color is within threshold distance of stimulus"""
        distance = self.color_distance()
        return distance is not None and distance <= threshold

    def to_dict(self):
        return {
            "id": self.id,
            "participant_id": self.participant_id,
            "stimulus_id": self.stimulus_id,
            "trial_index": self.trial_index,
            "selected_r": self.selected_r,
            "selected_g": self.selected_g,
            "selected_b": self.selected_b,
            "selected_hex": self.selected_hex_color,
            "response_ms": self.response_ms,
            "color_distance": self.color_distance(),
            "is_exact_match": self.is_exact_match(),
            "meta_json": self.meta_json or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TestData(db.Model):
    """Aggregated color test metrics (CCT/SCT results)"""
    __tablename__ = "test_data"
    __table_args__ = (
        Index('idx_td_user_test_created', 'user_id', 'test_id', 'created_at'),
        Index('idx_td_user_test_type', 'user_id', 'test_type'),
        Index('idx_td_session_test', 'session_id', 'test_type'),
        Index('idx_td_owner_family', 'owner_researcher_id', 'family'),
    )

    id = db.Column(db.Integer, primary_key=True)
    
    # User linkage - string ID to match participant_id in ColorTrial
    user_id = db.Column(db.String(64), index=True, nullable=True)
    
    # Foreign key to Test
    test_id = db.Column(db.Integer, db.ForeignKey('tests.id'), nullable=True, index=True)
    test = db.relationship('Test', backref='test_data_entries', lazy='joined')
    
    # Foreign key to Researcher
    owner_researcher_id = db.Column(db.Integer, db.ForeignKey('researchers.id'), nullable=True, index=True)
    owner = db.relationship('Researcher', backref='test_data_entries', lazy='joined')
    
    session_id = db.Column(db.Integer, nullable=True, index=True)

    # Foreign key to ColorStimulus
    stimulus_id = db.Column(
        db.Integer,
        db.ForeignKey("color_stimuli.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    stimulus = db.relationship("ColorStimulus", back_populates="test_data_entries", lazy="joined")

    # Test metadata
    test_type = db.Column(db.String(64), nullable=True, index=True)
    stimulus_type = db.Column(db.String(64), nullable=True)
    family = db.Column(db.String(16), nullable=False, default="color", index=True)
    locale = db.Column(db.String(16), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Trial information
    trial = db.Column(db.Integer, nullable=True)
    
    # CCT Configuration
    cct_cutoff = db.Column(db.Float, nullable=True)
    cct_triggers = db.Column(db.Integer, nullable=True)
    cct_trials_per_trigger = db.Column(db.Integer, nullable=True)
    cct_valid = db.Column(db.Integer, nullable=True)

    # CCT Metrics
    cct_none_pct = db.Column(db.Float, nullable=True)
    cct_rt_mean = db.Column(db.Integer, nullable=True)
    cct_mean = db.Column(db.Float, nullable=True)
    cct_std = db.Column(db.Float, nullable=True)
    cct_median = db.Column(db.Float, nullable=True)

    # CCT Detailed Results
    cct_per_trigger = db.Column(db.JSON, nullable=True)
    cct_pairwise = db.Column(db.JSON, nullable=True)
    cct_pass = db.Column(db.Boolean, nullable=True, index=True)

    def __repr__(self):
        return f"<TestData id={self.id} user={self.user_id} type={self.test_type} pass={self.cct_pass}>"

    def get_consistency_score(self):
        """Calculate overall consistency score from available metrics"""
        if self.cct_mean is not None and self.cct_std is not None:
            # Lower std relative to mean = higher consistency
            if self.cct_mean > 0:
                return 1 - min(self.cct_std / self.cct_mean, 1)
        return None

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
            "consistency_score": self.get_consistency_score(),
        }

# ======================================================
# SCREENING TEST DATA MODELS
# ======================================================


class ScreeningTestData(db.Model):
    """Stores completed screening test results with scores"""
    __tablename__ = 'screening_test_data'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('participants.id'), index=True, nullable=False)
    participant = db.relationship('Participant', backref='screening_test_data', lazy='joined')
    
    test_code = db.Column(db.String(50), nullable=False)
    version = db.Column(db.String(50))
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    status = db.Column(db.String(50))
    rt_mean_ms = db.Column(db.Integer)
    accuracy = db.Column(db.Float)
    consistency_score = db.Column(db.Float)
    result_label = db.Column(db.String(100))
    likelihood_score = db.Column(db.Float)
    recommendation = db.Column(db.String(255))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<ScreeningTestData user_id={self.user_id} test={self.test_code}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "test_code": self.test_code,
            "version": self.version,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "status": self.status,
            "rt_mean_ms": self.rt_mean_ms,
            "accuracy": self.accuracy,
            "consistency_score": self.consistency_score,
            "result_label": self.result_label,
            "likelihood_score": self.likelihood_score,
            "recommendation": self.recommendation,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        

class SpeedCongruency(db.Model):
    """
    One row per speed-congruency trial.

    Goal:
      - Link each trial to a participant (string id, like ColorTrial.participant_id).
      - Optionally link to a ColorStimulus row that represents the participant's
        learned/associated color from the Color Test (so we can check 'matched').
      - Record the cue/trigger shown in the speed test, the participant's choice,
        whether it matched the expected association, and the reaction time.
    """
    __tablename__ = "speed_congruency"

    id = db.Column(db.Integer, primary_key=True)

    # Participant linkage (mirror ColorTrial)
    participant_id = db.Column(db.String(64), index=True, nullable=True)

    # Optional linkage to the stimulus that encodes the participant's learned/expected color.
    # If you only know the expected RGB triplet, you can leave this NULL and just fill expected_*.
    stimulus_id = db.Column(
        db.Integer,
        db.ForeignKey("color_stimuli.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    stimulus = db.relationship("ColorStimulus", lazy="joined")

    # Trial/cue context
    trial_index = db.Column(db.Integer, nullable=True)              # 1..N within a run
    cue_word   = db.Column(db.String(128), nullable=True, index=True)  # e.g., "PRESENTATION"
    cue_type   = db.Column(db.String(32), nullable=True)            # e.g., 'word', 'image', etc. (future-proof)

    # Expected association (from Color Test)
    expected_r = db.Column(db.Integer, nullable=True)
    expected_g = db.Column(db.Integer, nullable=True)
    expected_b = db.Column(db.Integer, nullable=True)

    # User's response on the speed test
    chosen_name = db.Column(db.String(32), nullable=True)           # 'red' | 'orange' | ...
    chosen_r    = db.Column(db.Integer, nullable=True)
    chosen_g    = db.Column(db.Integer, nullable=True)
    chosen_b    = db.Column(db.Integer, nullable=True)

    # Outcome + timing
    matched     = db.Column(db.Boolean, nullable=True, index=True)  # did chosen color match expected association?
    response_ms = db.Column(db.Integer, nullable=True)              # reaction time in ms

    # Free-form context (device info, run id, version, etc.)
    meta_json   = db.Column(db.JSON, nullable=True)

    created_at  = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "participant_id": self.participant_id,
            "stimulus_id": self.stimulus_id,
            "trial_index": self.trial_index,
            "cue_word": self.cue_word,
            "cue_type": self.cue_type,
            "expected_r": self.expected_r,
            "expected_g": self.expected_g,
            "expected_b": self.expected_b,
            "chosen_name": self.chosen_name,
            "chosen_r": self.chosen_r,
            "chosen_g": self.chosen_g,
            "chosen_b": self.chosen_b,
            "matched": self.matched,
            "response_ms": self.response_ms,
            "meta_json": self.meta_json or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# ======================================================
# ANALYZED TEST DATA MODELS
# ======================================================

class AnalyzedTestData(db.Model):
    """Analyzed/processed test results with diagnostic classifications"""
    __tablename__ = 'analyzed_test_data'
    __table_args__ = (
        Index('idx_atd_user_test_created', 'user_id', 'test_id', 'created_at'),
        Index('idx_atd_user_diagnosis', 'user_id', 'diagnosis'),
        Index('idx_atd_test_family', 'test_type', 'family'),
        Index('idx_atd_owner_family', 'owner_researcher_id', 'family'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign key to Participant
    user_id = db.Column(db.Integer, db.ForeignKey('participants.id'), index=True, nullable=False)
    participant = db.relationship('Participant', backref='analyzed_test_data', lazy='joined')
    
    # Foreign key to Test
    test_id = db.Column(db.Integer, db.ForeignKey('tests.id'), nullable=True, index=True)
    test = db.relationship('Test', backref='analyzed_results', lazy='joined')
    
    test_type = db.Column(db.String(50), nullable=True, index=True)
    
    # Foreign key to Researcher
    owner_researcher_id = db.Column(db.Integer, db.ForeignKey('researchers.id'), nullable=True, index=True)
    researcher = db.relationship('Researcher', backref='analyzed_tests', lazy='joined')
    
    # Foreign key to ColorStimulus (if applicable)
    stimulus_id = db.Column(
        db.Integer, 
        db.ForeignKey('color_stimuli.id', ondelete='SET NULL'), 
        nullable=True, 
        index=True
    )
    stimulus = db.relationship('ColorStimulus', back_populates='analyzed_data_entries', lazy='joined')
    
    stimulus_type = db.Column(db.String(50), nullable=True)
    trial_int = db.Column(db.Integer, nullable=True)
    
    # Test family: 'color', 'gustatory', 'space', etc.
    family = db.Column(db.String(50), nullable=False, default='color', index=True)
    
    session_id = db.Column(db.Integer, nullable=True, index=True)
    locale = db.Column(db.String(10), nullable=True)
    
    # Diagnostic outcome - True indicates positive diagnosis for synesthesia
    diagnosis = db.Column(db.Boolean, nullable=True, index=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<AnalyzedTestData id={self.id} user={self.user_id} test={self.test_type} diagnosis={self.diagnosis}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "test_id": self.test_id,
            "test_type": self.test_type,
            "owner_researcher_id": self.owner_researcher_id,
            "stimulus_id": self.stimulus_id,
            "stimulus_type": self.stimulus_type,
            "trial_int": self.trial_int,
            "family": self.family,
            "session_id": self.session_id,
            "locale": self.locale,
            "diagnosis": self.diagnosis,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }