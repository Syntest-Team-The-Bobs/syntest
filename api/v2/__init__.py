from flask import Blueprint
import common

# =====================================
# IMPORTING ENDPOINTS
# =====================================
from .dashboard import bp as dashboard_bp
from .colortest import bp as colortest_bp
from .screening import bp as screening_bp
from .researcher_dashboard import bp as researcher_dashboard_bp
from .speedcongruency import bp as speedcongruency_bp

# =====================================
# Setup blueprint
# =====================================
bp_v2 = Blueprint("api_v2", __name__)

# =====================================
# REGISTERING ENDPOINTS
# =====================================
bp_v2.register_blueprint(dashboard_bp, url_prefix="participant/dashboard")
bp_v2.register_blueprint(colortest_bp, url_prefix="/tests/color/")
bp_v2.register_blueprint(screening_bp, url_prefix="/screening/")
bp_v2.register_blueprint(researcher_dashboard_bp, url_prefix="/researcher/dashboard")
bp_v2.register_blueprint(speedcongruency_bp, url_prefix="/speedcongruency")

# =====================================
# AUTHENTICATION ENDPOINTS
# =====================================


@bp_v2.route("/auth/signup", methods=["POST"])
def api_signup():
    return common.api_signup()


@bp_v2.route("/auth/login", methods=["POST"])
def api_login():
    return common.api_login()


@bp_v2.route("/auth/logout", methods=["POST"])
def api_logout():
    return common.api_logout()


@bp_v2.route("/auth/me", methods=["GET"])
def api_get_current_user():
    return common.api_get_current_user()
