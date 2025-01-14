import os

from flask import Flask
from flask_assets import Bundle, Environment
from flask_socketio import SocketIO

from flaskr.dance import DanceNamespace

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

    from flaskr import db, scripts

    db.init_app(app)
    scripts.init_app(app)

    controllers = Bundle(
        "controllers/index.js",
        "controllers/game-controller.js",
        "controllers/home-controller.js",
        filters="jsmin",
        output="gen/controller.bundle.js",
    )
    assets.register("controllers", controllers)

    from flaskr.routes import app_routes

    app.register_blueprint(app_routes)
    socketio.on_namespace(DanceNamespace("/dance"))

    return app
