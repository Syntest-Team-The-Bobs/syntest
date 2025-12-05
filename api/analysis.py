"""
Analysis utilities for color tests (CCT/CCT-like analysis)

Provides conversion helpers (sRGB->linear->XYZ->CIELUV), per-trigger
consistency computation, participant scoring, DB update helpers and a
small Flask blueprint endpoint to trigger analysis for a participant.

This module is safe to call after a participant completes their color tests.
"""
from math import pow, sqrt
from collections import defaultdict
from statistics import mean, median, pstdev
from flask import Blueprint, request, jsonify, session

from api.models import db, Participant, ColorTrial, TestData, AnalyzedTestData

bp = Blueprint("analysis", __name__, url_prefix="/api/analysis")


# ---------------------- Color conversions ----------------------
def srgb_channel_to_linear(c):
  """Convert a single sRGB channel in [0..1] to linear value."""
  if c <= 0.04045:
    return c / 12.92
  return pow((c + 0.055) / 1.055, 2.4)


def rgb255_to_linear(rgb):
  """Convert (r,g,b) in 0..255 to linear RGB in 0..1."""
  r, g, b = rgb
  return (
    srgb_channel_to_linear(r / 255.0),
    srgb_channel_to_linear(g / 255.0),
    srgb_channel_to_linear(b / 255.0),
  )


def linear_rgb_to_xyz(r_lin, g_lin, b_lin):
  """Convert linear RGB to CIE XYZ using sRGB / D65 matrix."""
  X = 0.4124564 * r_lin + 0.3575761 * g_lin + 0.1804375 * b_lin
  Y = 0.2126729 * r_lin + 0.7151522 * g_lin + 0.0721750 * b_lin
  Z = 0.0193339 * r_lin + 0.1191920 * g_lin + 0.9503041 * b_lin
  return X, Y, Z


# Reference white D65 (Xn, Yn, Zn)
_D65 = (0.95047, 1.00000, 1.08883)


def xyz_to_luv(X, Y, Z, white=_D65):
  """Convert XYZ to CIELUV (L*, u*, v*)."""
  Xn, Yn, Zn = white
  denom = X + 15 * Y + 3 * Z
  if denom == 0:
    u_p = v_p = 0.0
  else:
    u_p = (4 * X) / denom
    v_p = (9 * Y) / denom

  denom_n = Xn + 15 * Yn + 3 * Zn
  if denom_n == 0:
    u_p_n = v_p_n = 0.0
  else:
    u_p_n = (4 * Xn) / denom_n
    v_p_n = (9 * Yn) / denom_n

  yr = Y / Yn if Yn != 0 else 0
  # L* computation
  if yr > pow(6.0 / 29.0, 3):
    L_star = 116.0 * pow(yr, 1.0 / 3.0) - 16.0
  else:
    L_star = (29.0 / 3.0) ** 3 * yr

  u = 13.0 * L_star * (u_p - u_p_n)
  v = 13.0 * L_star * (v_p - v_p_n)
  return L_star, u, v


def rgb255_to_luv(rgb):
  """Convenience: (r,g,b) in 0..255 -> (L,u,v)."""
  r_lin, g_lin, b_lin = rgb255_to_linear(rgb)
  X, Y, Z = linear_rgb_to_xyz(r_lin, g_lin, b_lin)
  return xyz_to_luv(X, Y, Z)


def luv_distance(a, b):
  """Euclidean distance between two Luv triples."""
  return sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)


# ---------------------- Analysis core ----------------------
def mean_pairwise_distance(triples):
  """Compute mean of the 3 pairwise distances for three Luv points.

  triples: list/tuple of three (L,u,v) tuples.
  """
  if len(triples) != 3:
    raise ValueError("Need exactly 3 samples to compute pairwise distances")
  d12 = luv_distance(triples[0], triples[1])
  d23 = luv_distance(triples[1], triples[2])
  d31 = luv_distance(triples[2], triples[0])
  return (d12 + d23 + d31) / 3.0, dict(d12=d12, d23=d23, d31=d31)


def analyze_participant(participant_str_id, min_triggers=1, cutoff=135.0, aggregate_method="mean"):
  """Run analysis for a single participant and persist results to DB.

  - participant_str_id: string ID stored in ColorTrial.participant_id (e.g., 'P2025...')
  - min_triggers: minimum number of valid triggers required to compute a participant score
  - cutoff: threshold for classification (lower is more consistent)
  - aggregate_method: 'mean' or 'median'

  Returns: dict with per-trigger details and participant summary.
  """
  # Fetch trials for this participant
  trials = (
    ColorTrial.query.filter_by(participant_id=participant_str_id)
    .order_by(ColorTrial.stimulus_id.asc(), ColorTrial.trial_index.asc())
    .all()
  )

  if not trials:
    return {"error": "no_trials"}

  # Group by stimulus_id (if present) else by a fallback key from meta_json
  groups = defaultdict(list)
  for t in trials:
    key = t.stimulus_id if t.stimulus_id is not None else (t.meta_json or {}).get("trigger", "__unknown__")
    groups[key].append(t)

  per_trigger = {}
  none_counts = 0
  rt_list = []
  valid_trigger_scores = []

  for key, trs in groups.items():
    # We expect 3 trials per trigger; if not, skip or mark incomplete
    if len(trs) < 3:
      per_trigger[str(key)] = {"status": "incomplete", "n_trials": len(trs)}
      continue

    # Consider only the first three ordered by trial_index
    trs_sorted = sorted(trs, key=lambda x: x.trial_index or 0)[:3]

    # Check no_color: treat as no_color if selected_r/g/b are all None
    has_no_color = any(
      not all(v is not None for v in [t.selected_r, t.selected_g, t.selected_b])
      for t in trs_sorted
    )

    if has_no_color:
      none_counts += 1
      per_trigger[str(key)] = {"status": "no_color_present", "n_trials": len(trs_sorted)}
      continue

    # Convert to Luv
    luvs = []
    # also compute mean RGB for a representative association
    mean_r = mean_g = mean_b = 0
    for t in trs_sorted:
      rgb = (t.selected_r, t.selected_g, t.selected_b)
      luv = rgb255_to_luv(rgb)
      luvs.append(luv)
      if t.response_ms is not None:
        rt_list.append(t.response_ms)
      # accumulate RGB (they are ints)
      mean_r += (t.selected_r or 0)
      mean_g += (t.selected_g or 0)
      mean_b += (t.selected_b or 0)

    mean_d, pairwise = mean_pairwise_distance(luvs)
    per_trigger[str(key)] = {
      "status": "ok",
      "n_trials": 3,
      "mean_d": mean_d,
      "pairwise": pairwise,
    }
    # representative color: average the three samples
    try:
      rep_r = int(round(mean_r / 3.0))
      rep_g = int(round(mean_g / 3.0))
      rep_b = int(round(mean_b / 3.0))
      rep_hex = f"#{rep_r:02x}{rep_g:02x}{rep_b:02x}"
      per_trigger[str(key)]["representative_rgb"] = [rep_r, rep_g, rep_b]
      per_trigger[str(key)]["representative_hex"] = rep_hex
    except Exception:
      pass
    valid_trigger_scores.append(mean_d)

  # Participant-level aggregation
  if not valid_trigger_scores or len(valid_trigger_scores) < min_triggers:
    participant_summary = {
      "status": "insufficient_data",
      "n_valid_triggers": len(valid_trigger_scores),
      "n_no_color_triggers": none_counts,
    }
    # Persist a minimal TestData record marking insufficient
    td = TestData(
      user_id=participant_str_id,
      test_type="color_cct",
      cct_triggers=len(valid_trigger_scores),
      cct_trials_per_trigger=3,
      cct_valid=0,
      cct_none_pct=(none_counts / max(1, len(groups))) * 100.0,
    )
    db.session.add(td)  # type: ignore[attr-defined]
    db.session.commit()  # type: ignore[attr-defined]
    return {"per_trigger": per_trigger, "participant": participant_summary}

  if aggregate_method == "median":
    participant_score = median(valid_trigger_scores)
  else:
    participant_score = mean(valid_trigger_scores)

  import statistics

  cct_mean = statistics.mean(valid_trigger_scores)
  cct_std = statistics.pstdev(valid_trigger_scores) if len(valid_trigger_scores) > 1 else 0.0
  cct_median = statistics.median(valid_trigger_scores)

  none_pct = (none_counts / max(1, len(groups))) * 100.0
  rt_mean = int(mean(rt_list)) if rt_list else None

  diagnosis = participant_score < cutoff

  participant_summary = {
    "status": "ok",
    "participant_score": participant_score,
    "cct_mean": cct_mean,
    "cct_std": cct_std,
    "cct_median": cct_median,
    "n_valid_triggers": len(valid_trigger_scores),
    "n_no_color_triggers": none_counts,
    "none_pct": none_pct,
    "rt_mean": rt_mean,
    "diagnosis": "synesthete" if diagnosis else "non_synesthete",
  }

  # Persist TestData
  td = TestData(
    user_id=participant_str_id,
    test_type="color_cct",
    cct_cutoff=cutoff,
    cct_triggers=len(groups),
    cct_trials_per_trigger=3,
    cct_valid=len(valid_trigger_scores),
    cct_none_pct=none_pct,
    cct_rt_mean=rt_mean,
    cct_mean=cct_mean,
    cct_std=cct_std,
    cct_median=cct_median,
    cct_per_trigger=per_trigger,
    cct_pass=diagnosis,
  )
  db.session.add(td)  # type: ignore[attr-defined]
  db.session.commit()  # type: ignore[attr-defined]

  # Persist AnalyzedTestData (diagnosis record)
  # Find Participant numeric id if possible
  participant = Participant.query.filter_by(participant_id=participant_str_id).first()
  if participant:
    atd = AnalyzedTestData(
      user_id=participant.id,
      test_type="color_cct",
      diagnosis=diagnosis,
    )
    db.session.add(atd)  # type: ignore[attr-defined]
    db.session.commit()  # type: ignore[attr-defined]

  return {"per_trigger": per_trigger, "participant": participant_summary}


@bp.route("/run", methods=["POST"])
def run_analysis():
  data = request.get_json(force=True) or {}
  participant_str_id = data.get("participant_id")
  # If participant_id not passed, try to infer from session user
  if not participant_str_id:
    try:
      user_id = session.get("user_id")
      if user_id:
        participant = Participant.query.get(user_id)
        if participant:
          participant_str_id = participant.participant_id
    except Exception:
      participant_str_id = None

  if not participant_str_id:
    return jsonify({"error": "participant_id required"}), 400

  try:
    result = analyze_participant(participant_str_id)
    return jsonify(result)
  except Exception as e:
    db.session.rollback()  # type: ignore[attr-defined]
    return jsonify({"error": str(e)}), 500
