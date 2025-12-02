# 🧠 SYNTEST — Synesthesia Research Platform

SYNTEST is a full-stack web application designed to conduct and analyze online synesthesia experiments.
It enables researchers to screen participants, administer perception tests, and collect consistent, anonymized data — all through an accessible, browser-based interface.

---

## ⚙️ Installation & Setup

### **1. Clone the Repository**

```bash
git clone https://github.com/yourusername/syntest.git
cd syntest
```

### 2. Backend Dependencies

```bash
# Go into the backend folder
cd api

# Create virtualenv (recommended)
python -m venv .venv

# Activate the virtualenv
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Go back to project root
cd ..
```

**Note:** If you don't use a virtual environment, install globally: `pip install -r api/requirements.txt`

### 3. Frontend Dependencies

```bash
# Make sure you're in the project root (not in api/)
npm install
```

### 4. Run it!

#### Option 1: Run everything together (recommended)
```bash
npm start
# or
npm run dev:all
```
This will start both backend and frontend servers simultaneously.

#### Option 2: Run servers separately
```bash
# Terminal 1 - Backend:
npm run api
# or
npm run dev:backend

# Alternative: If using virtual environment with Flask CLI:
# Windows: cd api && .venv\Scripts\flask run --no-debugger
# Mac/Linux: cd api && .venv/bin/flask run --no-debugger

# Terminal 2 - Frontend:
npm run dev
# or  
npm run dev:frontend
```

#### Option 3: Use the start script
```bash
# Windows:
start.bat

# Mac/Linux:
chmod +x start.sh
./start.sh
```

#### Initialize Database (if needed)
If you get database errors, initialize the database first:
```bash
npm run init-db
```

---

## 🚀 Features

### **Participant Experience**

* **Multi-step screening questionnaire** to assess eligibility and synesthetic traits.
* **Interactive color-matching tests** (e.g., Number–Color, Letter–Color) with real-time visual feedback.
* **Responsive and distraction-free UI** designed to simulate controlled laboratory conditions.
* **Automatic session tracking** allowing users to complete assigned tasks sequentially.

### **Researcher Tools**

* **Secure authentication and role-based access control** (RBAC).
* **Dedicated researcher accounts** with access code protection (`RESEARCH2025`).
* **Data collection pipeline** prepared for aggregation and analysis of consistency, accuracy, and reaction time metrics.

---

## 🧩 Architecture Overview

**Frontend**

* Built with **Flask + Jinja2 templates** for dynamic rendering.
* Modular JavaScript structure controlling progressive test flows.
* Responsive design using CSS with a neutral black-and-white color palette to prevent perceptual bias.

**Backend**

* Developed using **Flask (Python)**.
* Implements **secure session management**, **password hashing**, and **RBAC**.
* Routes structured for each experimental phase: authentication, screening, task flow, and researcher dashboard.
* Connected to **SQLAlchemy** database for participant records and test data (extensible schema for future studies).

---

## 🧠 Experimental Flow

1. **Landing Page** → Participant chooses to Sign Up or Log In.
2. **Screening Questionnaire** → 5-step eligibility check (health, definition, trigger type, synesthetic type, routing summary).
3. **Task Assignment** → Participants proceed to the appropriate test (e.g., Number–Color Consistency Test).
4. **Testing Phase** → Users interact with a dynamic color wheel; data is stored securely for analysis.
5. **Completion** → Participants exit or are redirected based on their assigned tasks.

---

## 🔒 Security & Ethics

* Passwords securely hashed using PBKDF2 with salt (Werkzeug).
* Researcher accounts protected via special code (`RESEARCH2025`).
* All design and data collection methods adhere to ethical research standards for online cognitive studies.

---

## 🧪 Future Development

Planned enhancements include:

* Researcher analytics dashboard for aggregated results visualization.
* Automated data export to CSV/JSON for offline statistical analysis.
* Additional test modules (e.g., **Sound–Color**, **Lexical–Taste**, **Sequence–Space**).
* Improved mobile optimization and accessibility compliance (WCAG 2.1).

---

## 👩‍🔬 Contributors

* **Rachel Tran**
* **Rishit Chatterjee**
* **Tenzin Thinley**
* **Robbie Benett**
* **Tin Nguyen**

---
