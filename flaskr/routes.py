from flask import Blueprint, render_template, request

app_routes = Blueprint("app", __name__)


@app_routes.route("/")
def home():
    return render_template("home.html")


@app_routes.route("/prepare")
def prepare():
    return render_template("prepare.html")


@app_routes.route("/dance", methods=["POST"])
def dance():
    request.get_json()
    return "Not implemented yet", 500


@app_routes.route("/score", methods=["POST"])
def score():
    return "Not implemented yet", 500
