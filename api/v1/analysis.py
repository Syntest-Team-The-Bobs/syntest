"""
Analysis utilities for color tests (CCT/CCT-like analysis)

This module provides Flask integration for color analysis. The core business
logic has been separated into analysis_core.py for improved testability.

This module handles:
- Database interactions (fetching trials, persisting results)
- Flask blueprint and endpoints
- Session management

The pure analysis logic is in analysis_core.py and achieves 100% test coverage.
"""

from flask import Blueprint, request, jsonify, session
from sqlalchemy import select
from models import db, Participant, ColorTrial, TestData, AnalyzedTestData
from .analysis_core import (
    analyze_participant_logic,
)

bp = Blueprint("analysis", __name__)


def analyze_participant(
    participant_str_id,
    min_triggers=1,
    cutoff=135.0,
    aggregate_method="mean",
    test_type=None,
):
    """Run analysis for a single participant and persist results to DB.

    This is a thin wrapper that:
    1. Fetches trials from the database
    2. Calls the pure business logic in analysis_core.py
    3. Persists results back to the database

    Args:
      participant_str_id: string ID stored in ColorTrial.participant_id (e.g., 'P2025...')
      min_triggers: minimum number of valid triggers required to compute a participant score
      cutoff: threshold for classification (lower is more consistent)
      aggregate_method: 'mean' or 'median'
      test_type: optional test type (letter, number, word, music) to filter trials; if None, analyzes all

    Returns:
      dict with per-trigger details and participant summary
    """
    # Step 1: Fetch trials from database
    stmt = (
        select(ColorTrial)
        .filter(ColorTrial.participant_id == participant_str_id)
        .order_by(ColorTrial.stimulus_id.asc(), ColorTrial.trial_index.asc())
    )
    all_trials = db.session.execute(stmt).scalars().all()

    # Filter by test_type if specified
    if test_type:
        trials = [
            t for t in all_trials if (t.meta_json or {}).get("test_type") == test_type
        ]
    else:
        trials = all_trials

    # Step 2: Run pure business logic (fully testable!)
    result = analyze_participant_logic(
        trials=trials,
        min_triggers=min_triggers,
        cutoff=cutoff,
        aggregate_method=aggregate_method,
        test_type=test_type,
        db_session=db.session,
    )

    # Step 3: Persist results to database
    if result.get("error") == "no_trials":
        return result

    participant_summary = result.get("participant", {})
    per_trigger = result.get("per_trigger", {})

    # Calculate groups for insufficient data case
    from collections import defaultdict

    groups = defaultdict(list)
    for t in trials:
        meta = t.meta_json or {}
        key = (
            t.stimulus_id
            if t.stimulus_id is not None
            else meta.get("trigger") or meta.get("stimulus") or "__unknown__"
        )
        groups[key].append(t)

    if participant_summary.get("status") == "insufficient_data":
        # Persist minimal TestData record
        td = TestData(
            user_id=participant_str_id,
            test_type=test_type or "color_cct",
            cct_triggers=participant_summary.get("n_valid_triggers", 0),
            cct_trials_per_trigger=3,
            cct_valid=0,
            cct_none_pct=participant_summary.get("none_pct", 0.0),
        )
        db.session.add(td)  # type: ignore[attr-defined]
        db.session.commit()  # type: ignore[attr-defined]
        return result

    # Persist full TestData record
    td = TestData(
        user_id=participant_str_id,
        test_type=test_type or "color_cct",
        test_id=None,
        cct_cutoff=cutoff,
        cct_triggers=len(groups),
        cct_trials_per_trigger=3,
        cct_valid=participant_summary.get("n_valid_triggers", 0),
        cct_none_pct=participant_summary.get("none_pct", 0.0),
        cct_rt_mean=participant_summary.get("rt_mean"),
        cct_mean=participant_summary.get("cct_mean"),
        cct_std=participant_summary.get("cct_std"),
        cct_median=participant_summary.get("cct_median"),
        cct_per_trigger=per_trigger,
        cct_pass=participant_summary.get("diagnosis") == "synesthete",
    )
    db.session.add(td)  # type: ignore[attr-defined]
    db.session.commit()  # type: ignore[attr-defined]

    # Persist AnalyzedTestData (diagnosis record)
    stmt = select(Participant).filter(Participant.participant_id == participant_str_id)
    participant = db.session.execute(stmt).scalar_one_or_none()
    if participant:
        atd = AnalyzedTestData(
            user_id=participant.id,
            test_type=test_type or "color_cct",
            diagnosis=participant_summary.get("diagnosis") == "synesthete",
        )
        db.session.add(atd)  # type: ignore[attr-defined]
        db.session.commit()  # type: ignore[attr-defined]

    return result


@bp.route("/run", methods=["GET", "POST"])
def run_analysis():
    # Support both GET (no body) and POST (JSON body) clients.
    if request.method == "POST":
        data = request.get_json(force=True) or {}
    else:
        # GET: read from query parameters
        data = {k: v for k, v in request.args.items()}
    participant_str_id = data.get("participant_id")
    # If participant_id not passed, try to infer from session user
    if not participant_str_id:
        try:
            user_id = session.get("user_id")
            if user_id:
                participant = db.session.get(Participant, user_id)
                if participant:
                    participant_str_id = participant.participant_id
        except Exception:
            participant_str_id = None

    if not participant_str_id:
        return jsonify({"error": "participant_id required"}), 400

    try:
        result = analyze_participant(participant_str_id)
        return jsonify(result)
    except Exception:
        db.session.rollback()  # type: ignore[attr-defined]
        import traceback

        traceback.print_exc()
        return jsonify({"error": "Analysis failed. Please try again later."}), 500
