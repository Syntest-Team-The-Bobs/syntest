# seed_dashboard_demo.py
"""
Seed script for researcher dashboard demo data.

Creates ~50 participants with realistic test data spread over time
to showcase dashboard charts and metrics.

Usage:
    python -m api.v1.seed_dashboard_demo
    # or
    from api.v1.seed_dashboard_demo import seed
    seed(app)
"""

import random
from datetime import datetime, timedelta, timezone

from werkzeug.security import generate_password_hash

from models import (
    ColorStimulus,
    Participant,
    Researcher,
    ScreeningSession,
    Test,
    TestResult,
    db,
)


def seed(app=None):
    """Seed database with ~50 participants and demo data for dashboard."""
    # If no app provided, import the default one
    if app is None:
        from app import app as default_app

        app = default_app

    with app.app_context():
        print("🌱 Seeding dashboard demo data...")
        print("=" * 60)

        # Get or create a researcher (needed for stimuli ownership)
        researcher = Researcher.query.first()
        if not researcher:
            researcher = Researcher(
                name="Demo Researcher",
                email="researcher@demo.com",
                password_hash=generate_password_hash("demo123"),
                institution="Demo University",
            )
            db.session.add(researcher)
            db.session.commit()
            print(f"✅ Created researcher: {researcher.email}")
        else:
            print(f"✅ Using existing researcher: {researcher.email}")

        # Create test types if they don't exist
        test_types = [
            {"name": "Grapheme-Color Test", "synesthesia_type": "Color"},
            {"name": "Number-Color Test", "synesthesia_type": "Color"},
            {"name": "Word-Color Test", "synesthesia_type": "Color"},
            {"name": "Music-Color Test", "synesthesia_type": "Color"},
        ]

        tests = []
        for test_spec in test_types:
            test = Test.query.filter_by(name=test_spec["name"]).first()
            if not test:
                test = Test(
                    name=test_spec["name"],
                    synesthesia_type=test_spec["synesthesia_type"],
                    description=f"Test for {test_spec['name']}",
                    duration=15,
                )
                db.session.add(test)
                db.session.flush()
                print(f"✅ Created test: {test.name}")
            else:
                print(f"✅ Using existing test: {test.name}")
            tests.append(test)

        db.session.commit()

        # Create some color stimuli if needed
        stimulus_types = ["letter", "number", "word"]
        for trigger_type in stimulus_types:
            count = ColorStimulus.query.filter_by(trigger_type=trigger_type).count()
            if count < 5:
                for i in range(5 - count):
                    r = random.randint(0, 255)
                    g = random.randint(0, 255)
                    b = random.randint(0, 255)
                    stim = ColorStimulus(
                        description=f"{trigger_type.capitalize()} {i+1}",
                        owner_researcher_id=researcher.id,
                        family="color",
                        trigger_type=trigger_type,
                        r=r,
                        g=g,
                        b=b,
                    )
                    db.session.add(stim)
        db.session.commit()
        print(f"✅ Ensured color stimuli exist")

        # Generate ~50 participants with varied creation dates
        num_participants = 50
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=60)  # Spread over last 60 days

        participants_created = 0
        participants_updated = 0

        for i in range(num_participants):
            # Vary creation date (more recent = more participants)
            days_ago = random.randint(0, 60)
            # Weight towards recent dates (exponential decay)
            if random.random() < 0.7:
                days_ago = random.randint(0, 30)
            created_at = start_date + timedelta(days=days_ago)

            email = f"demo.participant{i+1}@example.com"
            participant = Participant.query.filter_by(email=email).first()

            if not participant:
                participant = Participant(
                    name=f"Demo Participant {i+1}",
                    email=email,
                    password_hash=generate_password_hash("demo123"),
                    age=random.randint(18, 65),
                    country=random.choice(
                        ["USA", "Spain", "UK", "Germany", "France", "Canada"]
                    ),
                    created_at=created_at,
                    status=random.choice(["active", "active", "active", "inactive"]),
                    screening_completed=random.choice([True, True, False]),
                    synesthesia_type=random.choice(
                        [
                            "Grapheme-Color",
                            "Number-Color",
                            "Word-Color",
                            "Music-Color",
                            None,
                        ]
                    ),
                )
                db.session.add(participant)
                db.session.flush()
                participants_created += 1
            else:
                # Update existing participant's creation date if needed
                if participant.created_at is None or participant.created_at > created_at:
                    participant.created_at = created_at
                participants_updated += 1

            # Create screening session for ~70% of participants
            if random.random() < 0.7:
                session = ScreeningSession.query.filter_by(
                    participant_id=participant.id
                ).first()
                if not session:
                    session = ScreeningSession(
                        participant_id=participant.id,
                        status=random.choice(["completed", "completed", "in_progress"]),
                        eligible=random.choice([True, True, False]),
                        consent_given=True,
                        selected_types=random.choice(
                            [
                                ["Grapheme-Color"],
                                ["Number-Color"],
                                ["Word-Color"],
                                ["Grapheme-Color", "Number-Color"],
                                None,
                            ]
                        ),
                        started_at=created_at + timedelta(hours=1),
                        completed_at=created_at + timedelta(hours=2)
                        if random.random() < 0.8
                        else None,
                    )
                    db.session.add(session)

            # Create test results (1-5 tests per participant)
            num_tests = random.randint(1, 5)
            for j in range(num_tests):
                test = random.choice(tests)
                test_result = TestResult.query.filter_by(
                    participant_id=participant.id, test_id=test.id
                ).first()

                if not test_result:
                    # Vary completion dates (some recent, some older)
                    test_days_ago = random.randint(0, min(days_ago + 10, 60))
                    started_at = created_at + timedelta(days=test_days_ago)
                    completed_at = (
                        started_at + timedelta(minutes=random.randint(10, 30))
                        if random.random() < 0.85
                        else None
                    )

                    status = (
                        "completed"
                        if completed_at
                        else random.choice(["in_progress", "not_started"])
                    )

                    consistency_score = (
                        round(random.uniform(0.65, 0.98), 3)
                        if status == "completed"
                        else None
                    )

                    test_result = TestResult(
                        participant_id=participant.id,
                        test_id=test.id,
                        status=status,
                        consistency_score=consistency_score,
                        started_at=started_at,
                        completed_at=completed_at,
                    )
                    db.session.add(test_result)

            # Update last_login for some participants (recent activity)
            if random.random() < 0.4:
                login_days_ago = random.randint(0, 7)
                participant.last_login = now - timedelta(days=login_days_ago)

        db.session.commit()

        print("=" * 60)
        print(f"✅ Created {participants_created} new participants")
        print(f"✅ Updated {participants_updated} existing participants")
        print(f"✅ Total participants: {Participant.query.count()}")
        print(f"✅ Total test results: {TestResult.query.count()}")
        print(f"✅ Total screening sessions: {ScreeningSession.query.count()}")
        print("=" * 60)
        print("🎉 Dashboard demo data seeding complete!")
        print("\nYou can now view the dashboard with realistic data.")


if __name__ == "__main__":
    seed()

