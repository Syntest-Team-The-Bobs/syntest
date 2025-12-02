# services.py — Business logic services for screening
# Separates business logic from data models following SOLID principles

from models import (
    ScreeningSession, ScreeningHealth, ScreeningTypeChoice,
    YesNo, YesNoMaybe, Frequency, Test, ScreeningRecommendedTest
)


class TypeSelectionService:
    """Service for computing selected types from type choices."""
    
    @staticmethod
    def compute_selected_types(session):
        """
        Build a canonical list from type_choice (yes/sometimes only).
        """
        out = []
        tc = session.type_choice
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


class EligibilityService:
    """Service for computing eligibility and exit codes."""
    
    @staticmethod
    def compute_eligibility_and_exit(session):
        """
        Apply client-side flow:
          - If any health flags: exit 'BC'
          - If definition = 'no': exit 'A'
          - If pain_emotion = 'yes': exit 'D'
          - If no types selected: exit 'NONE'
          - Else eligible = True
        """
        # Health (step 1)
        if session.health and (session.health.drug_use or session.health.neuro_condition or session.health.medical_treatment):
            session.eligible = False
            session.exit_code = "BC"
            return

        # Definition (step 2)
        if session.definition and session.definition.answer == YesNoMaybe.no:
            session.eligible = False
            session.exit_code = "A"
            return

        # Pain & Emotion (step 3)
        if session.pain_emotion and session.pain_emotion.answer == YesNo.yes:
            session.eligible = False
            session.exit_code = "D"
            return

        # Types (step 4)
        types = TypeSelectionService.compute_selected_types(session)
        session.selected_types = types
        if not types:
            session.eligible = False
            session.exit_code = "NONE"
            return

        # Otherwise eligible
        session.eligible = True
        session.exit_code = None


class RecommendationService:
    """Service for generating test recommendations."""
    
    @staticmethod
    def compute_recommendations(session):
        """
        Derive recommended tests from selected_types.
        Stores JSON and fills normalized table. If a Test exists by name, link it.
        """
        mapping = {
            "Grapheme – Color": "Grapheme-Color",
            "Music – Color": "Music-Color",
            "Lexical – Taste": "Lexical-Gustatory",
            "Sequence – Space": "Sequence-Space",
        }

        results = []
        # Clear existing rows if recomputing
        session.recs.clear()

        for idx, label in enumerate(session.selected_types or []):
            base_name = mapping.get(label, label)  # fallback
            reason = f"Selected type: {label}"
            test_row = Test.query.filter(Test.name.ilike(base_name)).first()
            rec = ScreeningRecommendedTest(
                position=idx + 1,
                suggested_name=base_name,
                reason=reason,
                test_id=test_row.id if test_row else None,
            )
            session.recs.append(rec)
            results.append({
                "position": idx + 1,
                "name": base_name,
                "reason": reason,
                "test_id": test_row.id if test_row else None
            })

        session.recommended_tests = results

