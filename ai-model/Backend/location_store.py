from datetime import datetime, timezone


_latest_location = {
    "latitude": None,
    "longitude": None,
    "accuracy": None,
    "updated_at": None,
}


def update_location(latitude, longitude, accuracy=None):
    _latest_location.update({
        "latitude": float(latitude),
        "longitude": float(longitude),
        "accuracy": float(accuracy) if accuracy is not None else None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return get_location()


def get_location():
    return _latest_location.copy()
