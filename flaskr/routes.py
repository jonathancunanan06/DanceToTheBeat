import json

from flask import Blueprint, current_app, render_template, request, send_file
from ultralytics import YOLO
from webassets.env import os

import steps
from flaskr.db import get_db
from flaskr.videos import save_video

app_routes = Blueprint("app", __name__)


@app_routes.route("/")
def home():
    return render_template("home.html", items=["vid1", "vid2"])


@app_routes.route("/dance")
@app_routes.route("/dance/<reference_id>")
def dance(reference_id=None):
    return render_template("dance.html", reference_id=reference_id)


@app_routes.route("/reference", methods=["POST"])
def upload_video():
    if "file" not in request.files:
        return "No file part", 400
    id = save_video(request.files["file"])

    if id is None:
        return "Failed to upload to database", 500

    return {"reference_id": id}


@app_routes.route("/reference/<int:reference_id>")
def get_reference_video(reference_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        'SELECT filepath FROM "References" WHERE reference_id = ?', (reference_id,)
    )
    result = cursor.fetchone()
    return send_file(result[0])


@app_routes.route("/reference/<int:reference_id>/steps", methods=["GET"])
def get_reference_steps(reference_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "SELECT timestamp, pose FROM Steps WHERE reference_id = ? ORDER BY timestamp ASC",
        (reference_id,),
    )
    result = cursor.fetchall()
    return [(r[0], json.loads(r[1])) for r in result]
