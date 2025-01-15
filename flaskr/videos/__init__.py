import json
import os

import cv2
from flask import current_app
from ultralytics import YOLO
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

import steps
from flaskr.db import get_db


def save_video(file: FileStorage):
    if not file.filename or not file.filename.endswith(".mp4"):
        return None

    filename = secure_filename(file.filename)
    path = os.path.join(current_app.config["REFERENCES_FOLDER"], filename)
    file.save(path)
    return upload_reference(path, file.filename)


def upload_reference(path: str, filename: str, selection=False):
    with open(path, "rb") as video:
        (_tempo, beats, _y, _sr) = steps.music.analyze_audio(video)

    model_config = current_app.config["POSE_MODEL"] or "yolo11n-pose.pt"
    model = YOLO(model_config)

    frames = steps.video.get_frames(path, beats) or []
    result = steps.video.get_main_pose(model, frames, beats)

    if len(frames) == 0:
        thumbnail = None
    else:
        _, buffer = cv2.imencode(".jpg", frames[0])
        thumbnail = buffer.tobytes()

    title = filename.replace(".mp4", "")

    db = get_db()
    cursor = db.cursor()

    cursor.execute(
        'INSERT INTO "References" (filepath, title, selected, thumbnail) VALUES (?, ?, ?, ?)',
        (path, title, selection, thumbnail),
    )

    reference_id = cursor.lastrowid

    cursor.executemany(
        "INSERT INTO Steps (reference_id, timestamp, pose) VALUES (?, ?, ?)",
        [(reference_id, res[0], json.dumps(res[1])) for res in result],
    )

    db.commit()

    return reference_id
