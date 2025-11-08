# 🧠 SYNTEST — Synesthesia Research Platform

SYNTEST is a full-stack web application designed to conduct and analyze online synesthesia experiments.
It enables researchers to screen participants, administer perception tests, and collect consistent, anonymized data — all through an accessible, browser-based interface.

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

## ⚙️ Installation & Setup

### **1. Clone the Repository**

```bash
git clone https://github.com/yourusername/syntest.git
cd syntest
```

### **2. Install Dependencies**

```bash
pip install -r requirements.txt
```

### **3. Run the App**

```bash
python3 app.py
```

Visit [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

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
