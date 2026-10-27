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

    detected_at = Column(String(30))

    created_at = Column(TIMESTAMP)
