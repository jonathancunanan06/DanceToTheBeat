import time

from flask import Blueprint, current_app, render_template, send_file
from webassets.env import os

from flaskr.db import get_db

app_routes = Blueprint("app", __name__)


@app_routes.route("/")
def home():
    return render_template("home.html", items=["vid1", "vid2"])


@app_routes.route("/dance")
@app_routes.route("/dance/<reference_id>")
def dance(reference_id=None):
    return render_template("dance.html", reference_id=reference_id)


@app_routes.route("/reference", methods=["POST"])
def upload_video(reference_id):
    """
    # TODO: return the reference id of the newly uploaded video
    """
    db=get_db()
    reference = db.execute("SELECT * FROM References WHERE reference_id = ?", (reference_id,)).fetchone()
    time.sleep(5)
    return {"reference_id": reference["reference_id"]}


@app_routes.route("/reference/<reference_id>")
def get_reference_video(reference_id):
    path = os.path.join(current_app.instance_path, "Brazil.mp4")
    return send_file(path)


@app_routes.route("/reference/<reference_id>/steps", methods=["GET"])
def get_reference_steps():
    """
    fetch steps from database
    """
    return {"steps": []}
