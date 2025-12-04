def url(path=""):
    return f"/api/v1/color-test{path}"


def test_trial_requires_auth(client_logged_out):
    payload = {
        "trial_index": 1,
        "selected_r": 10,
        "selected_g": 20,
        "selected_b": 30,
        "response_ms": 500,
        "meta_json": {"stimulus": "demo"},
    }
    res = client_logged_out.post(url("/trial"), json=payload)
    assert res.status_code == 401


def test_save_trial_as_logged_in(client_logged_in):
    client, user = client_logged_in
    payload = {
        "trial_index": 1,
        "selected_r": 10,
        "selected_g": 20,
        "selected_b": 30,
        "response_ms": 500,
        "meta_json": {"stimulus": "demo"},
    }
    res = client.post(url("/trial"), json=payload)
    assert res.status_code == 201
    data = res.get_json()
    assert data["success"] is True
    assert data["trial"]["trial_index"] == 1
    # If Participant has participant_id, verify it was used
    if hasattr(user, "participant_id"):
        assert data["trial"]["participant_id"] == user.participant_id


def test_batch_and_session_start(client_logged_in_screened):
    client, _ = client_logged_in_screened

    # Session start
    res = client.post(url("/session/start"), json={"test_type": "letter"})
    assert res.status_code == 200
    assert res.get_json()["success"] is True

    # Batch save
    trials = [
        {
            "trial_index": 1,
            "selected_r": 1,
            "selected_g": 2,
            "selected_b": 3,
            "response_ms": 111,
            "meta_json": {},
        },
        {
            "trial_index": 2,
            "selected_r": 4,
            "selected_g": 5,
            "selected_b": 6,
            "response_ms": 222,
            "meta_json": {},
        },
    ]
    res = client.post(url("/batch"), json={"trials": trials})
    assert res.status_code == 201
    body = res.get_json()
    assert body["success"] is True
    assert body["count"] == 2
