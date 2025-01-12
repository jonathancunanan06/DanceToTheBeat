import os

from flask import Flask
from flask_socketio import SocketIO

socketio = SocketIO()


def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        # Define config variables
        DATABASE=os.path.join(app.instance_path, "database.sqlite"),
    )

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    from flaskr.routes import app_routes

    app.register_blueprint(app_routes)

    socketio.init_app(app)
    return app
