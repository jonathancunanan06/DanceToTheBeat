import os

from flask import Flask
from flask_assets import Bundle, Environment
from flask_socketio import SocketIO

socketio = SocketIO()
assets = Environment()


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

    socketio.init_app(app)
    assets.init_app(app)
    from flaskr import db

    db.init_app(app)

    controllers = Bundle(
        "main.js",
        "controllers/*.js",
        filters="jsmin",
        output="controller.bundle.js",
    )
    assets.register("controllers", controllers)

    from flaskr.routes import app_routes

    app.register_blueprint(app_routes)

    return app
