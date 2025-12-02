# seed_speed_congruency.py
"""
One-time seeding script for Speed Congruency dev testing.

It will:
- Create a Participant (email: speedtest@example.com, password: test1234)
- Create a few ColorStimulus rows (triggers + colors)
- Create TestData rows that mark those triggers as valid/pass color associations
"""

from datetime import datetime

from werkzeug.security import generate_password_hash

from app import app   # uses same db + config as your main API
from models import db, Participant, ColorStimulus, TestData


def seed():
    with app.app_context():
        # -------------------------------------------------
        # 1) Create / get a test participant
        # -------------------------------------------------
        email = "speedtest@example.com"
        password_plain = "test1234"

        participant = Participant.query.filter_by(email=email).first()
        if not participant:
            participant = Participant(
                name="Speed Test User",
                email=email,
                password_hash=generate_password_hash(password_plain),
                age=21,
                country="Spain",
            )
            db.session.add(participant)
            db.session.commit()
            print(f"Created participant: {email}")
        else:
            print(f"Found existing participant: {email}")

        print("Login credentials for dev:")
        print(f"  email:    {email}")
        print(f"  password: {password_plain}")
        print(f"  id:       {participant.id}")
        print()

        # -------------------------------------------------
        # 2) Create some ColorStimulus rows (trigger + RGB)
        # -------------------------------------------------
        stimulus_specs = [
            ("SUN",    255, 223,   0),
            ("MOON",   135, 206, 235),
            ("MUSIC",  144, 238, 144),
            ("MONDAY", 255, 105, 180),
        ]

        stimuli = []
        for desc, r, g, b in stimulus_specs:
            stim = (
                ColorStimulus.query
                .filter_by(description=desc, r=r, g=g, b=b)
                .first()
            )
            if not stim:
                stim = ColorStimulus(
                    description=desc,
                    r=r,
                    g=g,
                    b=b,
                    family="color",
                    trigger_type="word",  # optional
                    owner_researcher_id=None,
                    set_id=None,
                )
                db.session.add(stim)
                db.session.flush()  # get stim.id without full commit
                print(f"Created ColorStimulus: {desc} -> ({r},{g},{b}) [id={stim.id}]")
            else:
                print(f"Found existing ColorStimulus: {desc} [id={stim.id}]")

            stimuli.append(stim)

        # -------------------------------------------------
        # 3) Create TestData rows that link this participant to these stimuli
        #    and mark them as valid/pass color-test associations
        # -------------------------------------------------
        user_key = str(participant.id)   # this is what our speed API will use

        for stim in stimuli:
            existing_td = (
                TestData.query
                .filter_by(user_id=user_key, stimulus_id=stim.id, family="color")
                .first()
            )
            if existing_td:
                print(f"TestData already exists for user_id={user_key}, stimulus_id={stim.id}")
                continue

            td = TestData(
                user_id=user_key,
                test_id=None,
                owner_researcher_id=None,
                session_id=None,
                stimulus_id=stim.id,
                test_type="color-word",      # arbitrary label for now
                stimulus_type="word",
                family="color",
                locale="en",
                created_at=datetime.utcnow(),

                # Make them look like good / valid associations
                cct_cutoff=0.1,
                cct_triggers=1,
                cct_trials_per_trigger=3,
                cct_valid=1,
                cct_none_pct=0.0,
                cct_rt_mean=1000,
                cct_mean=0.05,
                cct_std=0.01,
                cct_median=0.05,
                cct_pass=True,
                cct_per_trigger=None,
                cct_pairwise=None,
            )
            db.session.add(td)
            print(f"Created TestData for stimulus_id={stim.id} and user_id={user_key}")

        db.session.commit()
        print("\nSeeding complete ✅")


if __name__ == "__main__":
    seed()
