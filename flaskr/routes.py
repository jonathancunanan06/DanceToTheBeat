from flask import Blueprint
from flask_socketio import emit

from flaskr import socketio

app_routes = Blueprint("app", __name__)


@app_routes.route("/")
def index():
    return "Hello world"


@socketio.on("/test")
def main_socket():
    emit("asdfas")
