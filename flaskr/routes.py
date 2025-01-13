import time

from flask import Blueprint, render_template

app_routes = Blueprint("app", __name__)


@app_routes.route("/")
def home():
    return render_template("home.html", items=["vid1", "vid2"])


@app_routes.route("/reference", methods=["POST"])
def upload_video():
    """
    # TODO: return the reference id of the newly uploaded video
    """
    time.sleep(5)
    return {"reference_id": 1}


@app_routes.route("/dance")
@app_routes.route("/dance/<reference_id>")
def dance(reference_id=None):
    return render_template("dance.html", reference_id=reference_id)


@app_routes.route("/reference/<reference_id>/steps", methods=["GET"])
def get_reference_steps():
    """
    fetch steps from database
    """
    return {"steps": []}
