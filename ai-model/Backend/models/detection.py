from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Float
from sqlalchemy import String
from sqlalchemy import TIMESTAMP

from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Detection(Base):

    __tablename__ = "detections"

    detection_id = Column(Integer, primary_key=True, index=True)

    track_id = Column(Integer)

    label = Column(String(50))

    confidence = Column(Float)

    length_cm = Column(Float)

    width_cm = Column(Float)

    image = Column(String(255))

    latitude = Column(Float)

    longitude = Column(Float)

    road_id = Column(Integer)

    status = Column(String(30))

    # Existing records stay visible as confirmed after the additive migration;
    # the ingestion API explicitly places every new record into review.
    verification_status = Column(
        String(24), nullable=False, default="confirmed", server_default="confirmed"
    )
    verifier_label = Column(String(50))
    verifier_confidence = Column(Float)
    verification_note = Column(String(500))
    verified_at = Column(TIMESTAMP)

    detected_at = Column(String(30))

    created_at = Column(TIMESTAMP)
