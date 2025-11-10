from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
import enum

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

    # Note: The following methods have been moved to service classes:
    # - compute_selected_types → TypeSelectionService.compute_selected_types
    # - compute_eligibility_and_exit → EligibilityService.compute_eligibility_and_exit
    # - compute_recommendations → RecommendationService.compute_recommendations
    
    # def compute_selected_types(self):
    #     """
    #     Build a canonical list from type_choice (yes/sometimes only).
    #     """
    #     out = []
    #     tc = self.type_choice
    #     if not tc:
    #         return out
    #     if tc.grapheme in {Frequency.yes, Frequency.sometimes}:
    #         out.append("Grapheme – Color")
    #     if tc.music in {Frequency.yes, Frequency.sometimes}:
    #         out.append("Music – Color")
    #     if tc.lexical in {Frequency.yes, Frequency.sometimes}:
    #         out.append("Lexical – Taste")
    #     if tc.sequence in {Frequency.yes, Frequency.sometimes}:
    #         out.append("Sequence – Space")
    #     if tc.other and tc.other.strip():
    #         out.append(f"Other: {tc.other.strip()}")
    #     return out

    # def compute_eligibility_and_exit(self):
    #     """
    #     Apply client-side flow:
    #       - If any health flags: exit 'BC'
    #       - If definition = 'no': exit 'A'
    #       - If pain_emotion = 'yes': exit 'D'
    #       - If no types selected: exit 'NONE'
    #       - Else eligible = True
    #     """
    #     # Health (step 1)
    #     if self.health and (self.health.drug_use or self.health.neuro_condition or self.health.medical_treatment):
    #         self.eligible = False
    #         self.exit_code = "BC"
    #         return

    #     # Definition (step 2)
    #     if self.definition and self.definition.answer == YesNoMaybe.no:
    #         self.eligible = False
    #         self.exit_code = "A"
    #         return

    #     # Pain & Emotion (step 3)
    #     if self.pain_emotion and self.pain_emotion.answer == YesNo.yes:
    #         self.eligible = False
    #         self.exit_code = "D"
    #         return

    #     # Types (step 4)
    #     types = self.compute_selected_types()
    #     self.selected_types = types
    #     if not types:
    #         self.eligible = False
    #         self.exit_code = "NONE"
    #         return

    #     # Otherwise eligible
    #     self.eligible = True
    #     self.exit_code = None

    # def compute_recommendations(self):
    #     """
    #     Derive recommended tests from selected_types.
    #     Stores JSON and fills normalized table. If a Test exists by name, link it.
    #     """
    #     mapping = {
    #         "Grapheme – Color": "Grapheme-Color",
    #         "Music – Color": "Music-Color",
    #         "Lexical – Taste": "Lexical-Gustatory",
    #         "Sequence – Space": "Sequence-Space",
    #     }

    #     results = []
    #     # Clear existing rows if recomputing
    #     self.recs.clear()

    #     for idx, label in enumerate(self.selected_types or []):
    #         base_name = mapping.get(label, label)  # fallback
    #         reason = f"Selected type: {label}"
    #         test_row = Test.query.filter(Test.name.ilike(base_name)).first()
    #         rec = ScreeningRecommendedTest(
    #             position=idx + 1,
    #             suggested_name=base_name,
    #             reason=reason,
    #             test_id=test_row.id if test_row else None,
    #         )
    #         self.recs.append(rec)
    #         results.append({
    #             "position": idx + 1,
    #             "name": base_name,
    #                         "reason": reason,
    #             "test_id": test_row.id if test_row else None
    #         })

    #     self.recommended_tests = results

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
# COLOR TEST MODELS (existing)
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