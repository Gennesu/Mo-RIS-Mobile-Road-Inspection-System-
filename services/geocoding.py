import json
from urllib import parse, request

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
USER_AGENT = "mo-ris/1.0 (+https://github.com/grad/mo-ris)"
CONTACT_EMAIL = "admin@example.com"


def reverse_geocode(lat, lon):
    if lat is None or lon is None:
        return None

    params = {
        "lat": str(lat),
        "lon": str(lon),
        "format": "jsonv2",
        "zoom": "18",
        "addressdetails": "1",
    }

    url = f"{NOMINATIM_URL}?{parse.urlencode(params)}"
    req = request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "From": CONTACT_EMAIL,
            "Accept-Language": "id",
        },
    )

    try:
        with request.urlopen(req, timeout=10) as resp:
            data = json.load(resp)
    except Exception:
        return None

    address = data.get("address", {}) or {}

    def join_parts(parts):
        return ", ".join([part for part in parts if part])

    road = address.get("road") or address.get("pedestrian") or address.get("footway") or address.get("path") or address.get("residential") or address.get("street")
    house_number = address.get("house_number")
    neighbourhood = address.get("neighbourhood")
    suburb = address.get("suburb")
    city = address.get("city") or address.get("town") or address.get("municipality") or address.get("village")
    state = address.get("state")
    postcode = address.get("postcode")
    country = address.get("country")

    if road or neighbourhood or suburb or city or state or postcode:
        street_part = join_parts([house_number, road]) if (house_number or road) else None
        return join_parts([street_part, neighbourhood, suburb, city, state, postcode, country])

    return data.get("display_name")
