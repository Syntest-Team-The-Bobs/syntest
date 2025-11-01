# app.py (snippet)
from flask import Flask, render_template
from views import api_screening as screening_api

app = Flask(__name__)

@app.route("/")
def home_redirect():
    return render_template("screen_flow.html", step=0)

app.register_blueprint(screening_api.bp)

@app.route("/screening/<int:step>")
def flow(step):
    step = max(0, min(step, 5))  # clamp to 0..5
    return render_template("screen_flow.html", step=step)


# Exit page content

EXIT_CONTENT = {
    "A": {  # “Thanks for your time” – no synesthesia reported
        "chip_label": "Exit: A",
        "heading": "Thanks for your time",
        "lead": "You indicated no synesthetic experience, so you are unable to continue in this study.",
        "thanks_line": None,
        "bullets": None,
        "note": None,
    },
    "BC": {  # Health & Substances
        "chip_label": "Exit: B/C",
        "heading": "Not eligible (B/C)",
        "thanks_line": "Thanks for your time!",
        "lead": "Based on your health and substances responses, you are not eligible for this study.",
        "bullets": None,
        "note": None,
    },
    "D": {  # Pain/Emotion triggers (as in your screenshot)
        "chip_label": "Exit: D",
        "heading": "Not eligible (D)",
        "thanks_line": "Thanks for your time!",
        "lead": "Experiences triggered by pain or emotions are excluded from this screening.",
        "bullets": None,
        "note": None,
    },
    "NONE": {  # No eligible types selected
        "chip_label": "Exit: None",
        "heading": "No eligible types selected",
        "thanks_line": "Thanks for your time!",
        "lead": "You didn’t select Yes or Maybe for any supported types, so there isn’t a follow-up task to run.",
        "bullets": None,
        "note": None,
    },
}

@app.route("/screening/exit/<code>")
def exit_page(code):
    data = EXIT_CONTENT.get(code.upper())
    if not data:
        from flask import abort
        abort(404)
    return render_template("exit.html", **data)

if __name__ == "__main__":
    app.run(debug=True)
