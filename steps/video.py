from typing import Generator, List

import cv2
from cv2.typing import MatLike
from numpy._typing import NDArray
from ultralytics import YOLO
from ultralytics.engine.model import Results


def get_frames(path: str, timestamps: NDArray) -> List[MatLike] | None:
    cap = cv2.VideoCapture(path)

    if not cap.isOpened:
        print("cannot open video file")
        return None

    try:
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_indices = [round(timestamp * fps) for timestamp in timestamps]

        frames = []
        for index in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, index)
            ret, frame = cap.read()
            if ret:
                frames.append(frame)
            else:
                print(f"Error: Could not read frame at index {index}")
        return frames
    finally:
        cap.release()


def track_pose(model: YOLO, frames: List[MatLike]) -> Generator[Results, None, None]:
    for frame in frames:
        result = model.track(frame, persist=True)
        yield result[0]
