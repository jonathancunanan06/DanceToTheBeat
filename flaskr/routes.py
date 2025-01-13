from flask import Blueprint, render_template, request

app_routes = Blueprint("app", __name__)


@app_routes.route("/")
def home():
    return render_template("home.html", items=["vid1", "vid2"] )


@app_routes.route("/dance")
def dance():
    return render_template("dance.html")
