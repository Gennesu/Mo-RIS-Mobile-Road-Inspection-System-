from pydantic import BaseModel


class Detection(BaseModel):
    track_id: int | None = None
    label: str
    confidence: float

    length_cm: float
    width_cm: float
    area_cm2: float

    severity: str

    bbox: list[int]

    image: str | None = None

    latitude: float | None = None
    longitude: float | None = None

    status: str = "Belum Ditangani"

    detected_at: str