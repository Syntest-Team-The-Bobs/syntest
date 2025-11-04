# speedcongruency_dev.py
from flask import Flask, render_template, request, jsonify

app = Flask(__name__,
            template_folder="templates",
            static_folder="static")

@app.get("/speed-congruency/instructions")
def speed_congruency_instructions():
    return render_template("speedcongruencyinstruction.html")

@app.get("/speed-congruency")
def speed_congruency_test():
    return render_template("speedcongruency.html")

# stub: logs payload instead of writing DB
@app.post("/api/speed-congruency/submit")
def submit_stub():
    print("STUB WRITE:", request.get_json(force=True))
    return jsonify(ok=True, id="stub-1")

if __name__ == "__main__":
    app.run(debug=True, port=5050)