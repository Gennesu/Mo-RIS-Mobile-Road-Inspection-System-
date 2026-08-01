from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import SessionLocal
from schemas.detection import Detection
import crud
from fastapi import HTTPException
from typing import Optional

router = APIRouter()


def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


@router.post("/detections")
def add_detection(
    data: Detection,
    db: Session = Depends(get_db)
):

    return crud.create_detection(
        db,
        data.model_dump()
    )


@router.get("/detections")
def get_detections(
    db: Session = Depends(get_db)
):

    return crud.get_all_detections(db)



@router.get("/statistics")
def statistics(
    db: Session = Depends(get_db)
):

    return crud.get_statistics(db)



@router.put("/detections/{detection_id}/status")
def update_detection_status(
    detection_id: int,
    status: str,
    db: Session = Depends(get_db)
):

    detection = crud.update_status(
        db,
        detection_id,
        status
    )

    if detection is None:
        raise HTTPException(
            status_code=404,
            detail="Detection not found"
        )

    return detection



@router.get("/detections/filter")
def filter_detections(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):

    return crud.get_filtered_detections(
        db,
        severity,
        status
    )