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
from .analysis import bp as analysis_bp

# =====================================
# Setup blueprint
# =====================================
bp_v1 = Blueprint("api_v1", __name__)


# =====================================
# REGISTERING ENDPOINTS
# =====================================
bp_v1.register_blueprint(dashboard_bp, url_prefix="/participant/dashboard/")
bp_v1.register_blueprint(colortest_bp, url_prefix="/color-test/")
bp_v1.register_blueprint(screening_bp, url_prefix="/screening/")
bp_v1.register_blueprint(researcher_dashboard_bp, url_prefix="/researcher/dashboard/")
bp_v1.register_blueprint(speedcongruency_bp, url_prefix="/speedcongruency/")
bp_v1.register_blueprint(analysis_bp, url_prefix="/analysis/")

# =====================================
# AUTHENTICATION ENDPOINTS
# =====================================


@bp_v1.route("/auth/signup", methods=["POST"])
def api_signup():
    return common.api_signup()


@bp_v1.route("/auth/login", methods=["POST"])
def api_login():
    return common.api_login()


@bp_v1.route("/auth/logout", methods=["POST"])
def api_logout():
    return common.api_logout()


@bp_v1.route("/auth/me", methods=["GET"])
def api_get_current_user():
    return common.api_get_current_user()
