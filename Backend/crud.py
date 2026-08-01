from sqlalchemy.orm import Session
from models.detection import Detection
from sqlalchemy import func


def create_detection(db: Session, data: dict):
    
    print("====data masuk====")
    
    print(data)
    data.pop("bbox", None)
    
    detection = Detection(**data)

    db.add(detection)

    db.commit()

    db.refresh(detection)
    
    print("====berhasil====")
    
    print("id:", detection.id)
    
    return detection


def get_all_detections(db: Session):

    return db.query(Detection).all()

def update_status(db, detection_id, status):

    detection = db.query(Detection).filter(
        Detection.id == detection_id
    ).first()

    if detection is None:
        return None

    detection.status = status

    db.commit()

    db.refresh(detection)

    return detection


def get_statistics(db: Session):

    total = db.query(Detection).count()

    ringan = db.query(Detection).filter(
        Detection.severity == "Ringan"
    ).count()

    sedang = db.query(Detection).filter(
        Detection.severity == "Sedang"
    ).count()

    parah = db.query(Detection).filter(
        Detection.severity == "Parah"
    ).count()

    return {
        "total": total,
        "ringan": ringan,
        "sedang": sedang,
        "parah": parah
    }
    
    
def get_filtered_detections(
    db: Session,
    severity: str = None,
    status: str = None
):

    query = db.query(Detection)

    if severity:
        query = query.filter(
            Detection.severity == severity
        )

    if status:
        query = query.filter(
            Detection.status == status
        )

    return query.all()