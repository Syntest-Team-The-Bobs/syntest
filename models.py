# ======================================================
# SCREENING v1 MODELS (additive, does not break existing)
# ======================================================

# Small enums for cleaner, constrained values

import enum 

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
    One row per screening run. Stores the overall status/eligibility plus
    denormalized 'selected_types' and 'recommended_tests' for quick reads.
    Normalized per-step answers live in the child tables below.
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

    def compute_selected_types(self):
        """
        Build a canonical list from type_choice (yes/sometimes only).
        """
        out = []
        tc = self.type_choice
        if not tc:
            return out
        if tc.grapheme in {Frequency.yes, Frequency.sometimes}:
            out.append("Grapheme – Color")
        if tc.music in {Frequency.yes, Frequency.sometimes}:
            out.append("Music – Color")
        if tc.lexical in {Frequency.yes, Frequency.sometimes}:
            out.append("Lexical – Taste")
        if tc.sequence in {Frequency.yes, Frequency.sometimes}:
            out.append("Sequence – Space")
        if tc.other and tc.other.strip():
            out.append(f"Other: {tc.other.strip()}")
        return out

    def compute_eligibility_and_exit(self):
        """
        Apply the exact flow you implemented client-side:
          - If any health flags: exit 'BC'
          - If definition = 'no': exit 'A'
          - If pain_emotion = 'yes': exit 'D'
          - If no types selected: exit 'NONE'
          - Else eligible = True
        """
        # Health (step 1)
        if self.health and (self.health.drug_use or self.health.neuro_condition or self.health.medical_treatment):
            self.eligible = False
            self.exit_code = "BC"
            return

        # Definition (step 2)
        if self.definition and self.definition.answer == YesNoMaybe.no:
            self.eligible = False
            self.exit_code = "A"
            return

        # Pain & Emotion (step 3)
        if self.pain_emotion and self.pain_emotion.answer == YesNo.yes:
            self.eligible = False
            self.exit_code = "D"
            return

        # Types (step 4)
        types = self.compute_selected_types()
        self.selected_types = types
        if not types:
            self.eligible = False
            self.exit_code = "NONE"
            return

        # Otherwise eligible
        self.eligible = True
        self.exit_code = None

    def compute_recommendations(self):
        """
        Derive recommended tests from selected_types.
        This stores easy-to-read JSON, and also fills the normalized table.
        If a matching Test exists by name, we link its id.
        """
        mapping = {
            "Grapheme – Color": "Grapheme-Color",
            "Music – Color": "Music-Color",
            "Lexical – Taste": "Lexical-Gustatory",
            "Sequence – Space": "Sequence-Space",
        }

        results = []
        # Clear existing rows if recomputing
        self.recs.clear()

        for idx, label in enumerate(self.selected_types or []):
            base_name = mapping.get(label, label)  # fallback
            reason = f"Selected type: {label}"
            # Try to resolve Test by name (case-insensitive)
            test_row = Test.query.filter(Test.name.ilike(base_name)).first()
            rec = ScreeningRecommendedTest(
                position=idx + 1,
                suggested_name=base_name,
                reason=reason,
                test_id=test_row.id if test_row else None,
            )
            self.recs.append(rec)
            results.append({
                "position": idx + 1,
                "name": base_name,
                "reason": reason,
                "test_id": test_row.id if test_row else None
            })

        self.recommended_tests = results

    def finalize(self):
        """
        Call this when the session is done (or at any decision point).
        """
        self.compute_eligibility_and_exit()
        if self.eligible:
            self.compute_recommendations()
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

    position = db.Column(db.Integer, nullable=False)          # 1-based order shown to the user
    suggested_name = db.Column(db.String(128), nullable=False) # human/lookup name (e.g., 'Grapheme-Color')
    reason = db.Column(db.String(255), nullable=True)

    test_id = db.Column(db.Integer, db.ForeignKey("tests.id"), nullable=True, index=True)
    test = db.relationship("Test", lazy="joined")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<ScreeningRecommendedTest S={self.session_id} {self.suggested_name} pos={self.position}>"
