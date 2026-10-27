from pydantic import BaseModel


class Detection(BaseModel):
    track_id: int | None = None
    label: str
    confidence: float

    length_cm: float
    width_cm: float

    bbox: list[int]

    image: str | None = None

    latitude: float | None = None
    longitude: float | None = None
    road_id: int | None = None

    status: str = "Menunggu Penanganan"

    verification_status: str = "pending_review"
    verifier_label: str | None = None
    verifier_confidence: float | None = None
    verification_note: str | None = None

    detected_at: str


class AIVerificationResult(BaseModel):
    label: str
    confidence: float | None = None
