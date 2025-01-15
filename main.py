#!/usr/bin/env python

from webassets.env import os

from flaskr import create_app, socketio

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    prod = bool(os.environ.get("PROD", False))
    socketio.run(app, debug=not prod, port=port)
