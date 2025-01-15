import base64

import cv2
import numpy as np
from flask import current_app
from flask_socketio import Namespace, emit
from ultralytics import YOLO


class DanceNamespace(Namespace):
    def on_connect(self):
        model_config = current_app.config["POSE_MODEL"] or "yolo11n-pose.pt"
        print(model_config)
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
