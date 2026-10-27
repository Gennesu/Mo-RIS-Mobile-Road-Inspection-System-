from flask import Blueprint, abort, render_template
from services.database import fetch_pothole_detail, fetch_potholes, fetch_priority_roads

user_bp = Blueprint("user", __name__)


@user_bp.route("/map")
def map():
    potholes = fetch_potholes()
    priority_roads = fetch_priority_roads()
    return render_template(
        "user/map.html",
        active_page="map",
        potholes=potholes,
        priority_roads=priority_roads,
    )


@user_bp.route("/pothole/<int:detection_id>")
def pothole_detail(detection_id):
    pothole = fetch_pothole_detail(detection_id)
    if pothole is None:
        abort(404)

    return render_template("user/detail.html", pothole=pothole)

# @user_bp.route("/map")
# def map():
    # potholes = [
    #     {
    #         "id": 1,
    #         "lat": -6.2363,
    #         "lng": 107.0244,
    #         "location_name": "Jl. Ahmad Yani",
    #         "severity": "0",
    #         "status": "Belum Ditangani",
    #         "time": "18:07",
    #     },
    #     {
    #         "id": 2,
    #         "lat": -6.2320,
    #         "lng": 107.0305,
    #         "location_name": "Jl. Ahmad Yani",
    #         "severity": "1",
    #         "status": "Belum Ditangani",
    #         "time": "18:07",
    #     },
    #     {
    #         "id": 3,
    #         "lat": -6.2408,
    #         "lng": 107.0202,
    #         "location_name": "Jl. Ahmad Yani",
    #         "severity": "3",
    #         "status": "Belum Ditangani",
    #         "time": "18:07",
    #     },
    #     {
    #         "id": 4,
    #         "lat": -6.2405,
    #         "lng": 107.0205,
    #         "location_name": "Jl. Ahmad Yani",
    #         "severity": "3",
    #         "status": "Belum Ditangani",
    #         "time": "18:07",
    #     },
    # ]
    # return render_template("user/map.html", active_page="map", potholes=potholes)
