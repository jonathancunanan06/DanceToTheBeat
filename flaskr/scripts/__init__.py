import json
import os
import shutil

import click
import cv2
from flask import Flask, current_app
from ultralytics import YOLO
from werkzeug.utils import secure_filename

import steps
from flaskr.videos import upload_reference
from steps.video import track_pose


@click.command("plot-beats")
@click.argument("path")
def plot_beats_command(path):
    steps.music.plot_beats(path)


@click.command("show-steps")
@click.argument("path")
def show_steps_command(path):
    with open(path, "rb") as file:
        (_tempo, beats, _y, _sr) = steps.music.analyze_audio(file)

    frames = steps.video.get_frames(path, beats) or []

    running = len(frames)
    while running:
        for frame in frames:
            cv2.imshow("Steps", frame)
            k = cv2.waitKey(100)
            if k == ord("q"):
                running = False
                break
    cv2.destroyAllWindows()


@click.command("show-pose")
@click.argument("path")
def show_pose_command(path):
    with open(path, "rb") as file:
        (_tempo, beats, _y, _sr) = steps.music.analyze_audio(file)

    frames = steps.video.get_frames(path, beats) or []
    poses = steps.video.track_pose(YOLO("yolo11n-pose.pt"), frames[:1])
    result = list(poses)

    running = len(result)
    while running:
        for frame in result:
            im = frame.plot()
            cv2.imshow("Pose", im)
            k = cv2.waitKey(100)
            if k == ord("q"):
                running = False
                break
    cv2.destroyAllWindows()


@click.command("get-pose")
@click.argument("path")
def get_pose_command(path):
    with open(path, "rb") as file:
        (_tempo, beats, _y, _sr) = steps.music.analyze_audio(file)

    beats = beats[:1]
    frames = steps.video.get_frames(path, beats) or []
    result = steps.video.get_main_pose(YOLO("yolo11n-pose.pt"), frames, beats)
    print(result)


@click.command("upload-video")
@click.argument("paths", nargs=-1)
def upload_video_command(paths):
    for p in paths:
        filename = os.path.basename(p)
        path = os.path.join(
            current_app.config["REFERENCES_FOLDER"], secure_filename(filename)
        )
        shutil.copy(p, path)
        upload_reference(path, filename, True)


def init_app(app: Flask):
    app.cli.add_command(plot_beats_command)
    app.cli.add_command(show_steps_command)
    app.cli.add_command(show_pose_command)
    app.cli.add_command(get_pose_command)
    app.cli.add_command(upload_video_command)
