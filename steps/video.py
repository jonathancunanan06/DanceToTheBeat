import json
from math import sqrt
from typing import Dict, Generator, List, Tuple

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


def geom_pose(obj) -> Tuple[float, float, float, float]:
    midX = (obj["box"]["x1"] + obj["box"]["x2"]) / 2
    midY = (obj["box"]["y1"] + obj["box"]["y2"]) / 2
    w = obj["box"]["x2"] - obj["box"]["x1"]
    h = obj["box"]["y2"] - obj["box"]["y1"]
    return (midX, midY, w, h)


def normalize_pose(obj) -> List[Tuple[float, float, float]]:
    keypoints = obj["keypoints"]

    (midX, midY, _w, h) = geom_pose(obj)

    x = [(x - midX) / h + 0.5 for x in keypoints["x"]]
    y = [(y - midY) / h + 0.5 for y in keypoints["y"]]
    visible = keypoints["visible"]

    return list(zip(visible, x, y))


def get_main_pose(
    model: YOLO,
    frames: List[MatLike],
    timestamps: NDArray,
) -> List[Tuple[float, List[Tuple[float, float, float]]]]:
    poses = track_pose(model, frames)
    results = [json.loads(pose.to_json(normalize=True)) for pose in poses]

    trackCenters: Dict[int, Tuple[int, float, float]] = dict()
    for res in results:
        for obj in res:
            id = obj["track_id"]
            (midX, midY, _, _) = geom_pose(obj)
            prevCenter = trackCenters.get(id)
            if prevCenter is None:
                trackCenters[id] = (1, midX, midY)
            else:
                trackCenters[id] = (
                    prevCenter[0] + 1,
                    prevCenter[1] + midX,
                    prevCenter[2] + midY,
                )

    if len(trackCenters) == 0:
        return []

    centerTrackId = None
    bestCenter = 2
    for k, (count, x, y) in trackCenters.items():
        dX = (x / count) - 0.5
        dY = (y / count) - 0.5
        dist = sqrt(dX * dX + dY * dY)
        if dist < bestCenter:
            bestCenter = dist
            centerTrackId = k

    if centerTrackId is None:
        return []

    res = []

    for i, timestamp in enumerate(timestamps):
        for obj in results[i]:
            if obj["track_id"] == centerTrackId:
                res.append((timestamp, normalize_pose(obj)))
                break
        else:
            if len(res) == 0:
                res.append((timestamp, [(0.0, 0.0, 0.0)] * 17))
            else:
                res.append((timestamp, res[-1][1]))

    return res
