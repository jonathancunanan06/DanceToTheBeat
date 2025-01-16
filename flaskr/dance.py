import base64
import json

import cv2
import numpy as np
from flask import current_app
from flask_socketio import Namespace, emit
from ultralytics import YOLO

from flaskr.db import get_db
from flaskr.videos import get_steps
from steps.video import grade_poses, normalize_pose


class DanceNamespace(Namespace):
    def on_connect(self):
        model_config = current_app.config["POSE_MODEL"] or "yolo11n-pose.pt"
        self.model = YOLO(model_config)

    def on_disconnect(self):
        self.model = None

    def on_prepare(self, data: str):
        image_data = base64.b64decode(data)
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if self.model is None or frame is None:
            return

        result = self.model.track(frame, persist=True)[0]
        emit("prepare_response", result.to_json())

    def on_dance(self, data, timestamp):
        image_data = base64.b64decode(data)
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if self.model is None or frame is None:
            return

        result = self.model.track(frame, persist=True)[0]
        result = json.loads(result.to_json(normalize=True))

        current_step = None
        for step in self.steps:
            if abs(step[0] - timestamp) < 0.001:
                current_step = step[1]

        if current_step is None:
            return

        dancers = dict()
        for dancer in result:
            id = dancer["track_id"]
            if not id in self.game_state:
                continue

            pose = normalize_pose(dancer)
            score = grade_poses(pose, current_step)

            [dancer_id, acc_score] = self.game_state[id]
            acc_score += score

            self.game_state[id] = [dancer_id, acc_score]

            dancers[id] = {
                "pose": pose,
                "score": score,
                "currentScore": acc_score / len(self.steps),
            }

        emit("dance_response", {"step": current_step, "dancers": dancers})

        self.frames += 1

    def on_register(self, reference_id, dancers):
        self.steps = get_steps(reference_id)
        db = get_db()
        cursor = db.cursor()

        cursor.execute(
            'INSERT INTO "Sessions" (reference_id) VALUES (?)', (reference_id,)
        )
        session_id = cursor.lastrowid

        self.game_state = dict()
        self.frames = 0

        def register_dancer(dancer):
            if dancer[1] is not None:
                image_data = base64.b64decode(dancer[1])
                nparr = np.frombuffer(image_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                _, buffer = cv2.imencode(".jpg", frame)
                avatar = buffer.tobytes()
            else:
                avatar = None

            cursor.execute(
                'INSERT INTO "Dancers" (session_id, avatar, score) VALUES (?, ?, ?)',
                (session_id, avatar, 0),
            )
            dancer_id = cursor.lastrowid
            self.game_state[dancer[0]] = [dancer_id, 0]

        for dancer in dancers:
            register_dancer(dancer)

        db.commit()
