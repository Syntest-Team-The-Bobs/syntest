from flask import Flask, render_template

app = Flask(__name__, static_folder='static', template_folder='templates')

@app.route("/")
def participants():
    return render_template("index.html")

@app.route("/flavor")
def flavor():
    return render_template("flavor.html")

@app.route("/color")
def color():
    return render_template("color.html")

# NEW: Association page
@app.route("/association")
def association():
    return render_template("association.html")

if __name__ == "__main__":
    app.run(debug=True)