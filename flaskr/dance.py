from flask_socketio import Namespace


class DanceNamespace(Namespace):
    def on_connect(self):
        print("connected")

    def on_disconnect(self):
        print("disconnected")
