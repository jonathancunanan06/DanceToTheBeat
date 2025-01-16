from io import BytesIO

from flask import Blueprint, render_template, request, send_file

from flaskr.db import get_db
from flaskr.videos import get_steps, save_video

app_routes = Blueprint("app", __name__)


@app_routes.route("/")
def home():
    sort_param = request.args.get("sort")
    cursor = get_db().cursor()

    base_query = """
    WITH HighestScores AS (
        SELECT 
            s.reference_id,
            MAX(d.score) as max_score
        FROM Sessions s
        LEFT JOIN Dancers d ON s.session_id = d.session_id
        GROUP BY s.reference_id
    ),
    ScoreAvatars AS (
        SELECT 
            s.reference_id,
            d.avatar,
            d.score,
            ROW_NUMBER() OVER (PARTITION BY s.reference_id ORDER BY d.score DESC) as rn
        FROM Sessions s
        JOIN Dancers d ON s.session_id = d.session_id
    )
    SELECT 
        r.reference_id,
        r.title,
        COALESCE(hs.max_score, 0) as highest_score,
        sa.reference_id as highest_scorer_id
    FROM "References" r
    LEFT JOIN HighestScores hs ON r.reference_id = hs.reference_id
    LEFT JOIN ScoreAvatars sa ON r.reference_id = sa.reference_id AND sa.rn = 1
    """

    if sort_param == "recent":
        label = "Recently played"
        # Order by the most recent session
        query = (
            base_query
            + """
        ORDER BY (
            SELECT MAX(session_id)
            FROM Sessions s2
            WHERE s2.reference_id = r.reference_id
        ) DESC
        """
        )
    elif sort_param == "collection":
        label = "Collection"
        # Show only selected references
        query = (
            base_query
            + """
        WHERE r.selected = 1
        ORDER BY r.reference_id
        """
        )
    else:
        label = "Home"
        # Default ordering by reference_id
        query = (
            base_query
            + """
        ORDER BY r.reference_id
        """
        )

    cursor.execute(query)
    videos = cursor.fetchall()

    # Convert videos to list of dictionaries
    videos_data = [
        {
            "reference_id": video["reference_id"],
            "title": video["title"],
            "highest_score": (
                video["highest_score"] if video["highest_score"] is not None else 0
            ),
            "highest_scorer_id": video["highest_scorer_id"],
        }
        for video in videos
    ]

    return render_template("home.html", videos=videos_data, label=label)


@app_routes.route("/dance")
@app_routes.route("/dance/<reference_id>")
def dance(reference_id=None):
    return render_template("dance.html", reference_id=reference_id)


@app_routes.route("/reference", methods=["POST"])
def upload_video():
    if "file" not in request.files:
        return "No file part", 400
    id = save_video(request.files["file"])

    if id is None:
        return "Failed to upload to database", 500

    return {"reference_id": id}


@app_routes.route("/reference/<int:reference_id>")
def get_reference_video(reference_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        'SELECT filepath FROM "References" WHERE reference_id = ?', (reference_id,)
    )
    result = cursor.fetchone()
    return send_file(result[0])


@app_routes.route("/reference/<int:reference_id>/thumbnail")
def get_reference_thumbnail(reference_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        'SELECT thumbnail FROM "References" WHERE reference_id = ?', (reference_id,)
    )
    result = cursor.fetchone()
    return send_file(BytesIO(result[0]), mimetype="image/jpeg")


@app_routes.route("/reference/<int:reference_id>/steps", methods=["GET"])
def get_reference_steps(reference_id):
    return get_steps(reference_id)
