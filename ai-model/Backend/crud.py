import os
from pathlib import Path

from sqlalchemy.orm import Session
from models.detection import Detection
from sqlalchemy import func
import location_store


VALID_STATUSES = {
    "Menunggu Penanganan",
    "Sedang Ditangani",
    "Selesai Ditangani",
}

STATUS_ALIASES = {
    "belum ditangani": "Menunggu Penanganan",
    "belum di tangani": "Menunggu Penanganan",
    "menunggu": "Menunggu Penanganan",
    "menunggu penanganan": "Menunggu Penanganan",
    "sedang ditangani": "Sedang Ditangani",
    "sedang di tangani": "Sedang Ditangani",
    "proses": "Sedang Ditangani",
    "processing": "Sedang Ditangani",
    "selesai ditangani": "Selesai Ditangani",
    "selesai di tangani": "Selesai Ditangani",
    "selesai": "Selesai Ditangani",
    "completed": "Selesai Ditangani",
}


def normalize_status(status):
    normalized = str(status or "").strip()
    if normalized in VALID_STATUSES:
        return normalized

    return STATUS_ALIASES.get(normalized.lower(), "Menunggu Penanganan")


def _rename_detection_image(image_value: str, detection: Detection):
    if not image_value:
        return

    workspace_root = Path(__file__).resolve().parents[2]
    static_image_path = workspace_root / "static" / image_value.lstrip("/")

    if not static_image_path.exists():
        return

    safe_label = str(detection.label).replace(" ", "_").lower()
    folder_name = "potholes" if safe_label == "pothole" else "cracks"
    label_dir = workspace_root / "static" / "assets" / "img" / folder_name
    label_dir.mkdir(parents=True, exist_ok=True)

    final_filename = f"{safe_label}_{detection.detection_id}.jpg"
    final_path = label_dir / final_filename

    if static_image_path != final_path:
        os.replace(static_image_path, final_path)

    detection.image = f"assets/img/{folder_name}/{final_filename}"
    db = Session.object_session(detection)
    if db is not None:
        db.add(detection)
        db.commit()
        db.refresh(detection)


def create_detection(db: Session, data: dict):

    print("====data masuk====")

    print(data)
    data.pop("bbox", None)
    data["status"] = normalize_status(data.get("status"))

    if data.get("latitude") is None or data.get("longitude") is None:
        latest_location = location_store.get_location()
        if (
            latest_location.get("latitude") is not None
            and latest_location.get("longitude") is not None
        ):
            data["latitude"] = latest_location["latitude"]
            data["longitude"] = latest_location["longitude"]
            print("Koordinat detection diisi dari lokasi perangkat terakhir.")

    detection = Detection(**data)

    db.add(detection)

    db.commit()

    db.refresh(detection)

    _rename_detection_image(data.get("image"), detection)

    print("====berhasil====")

    print("detection_id:", detection.detection_id)

    return detection


def get_all_detections(db: Session):

    return db.query(Detection).all()


def update_status(db, detection_id, status):

    detection = (
        db.query(Detection).filter(Detection.detection_id == detection_id).first()
    )

    if detection is None:
        return None

    detection.status = normalize_status(status)

    db.commit()

    db.refresh(detection)

    return detection


def get_statistics(db: Session):

    total = db.query(Detection).count()

    return {"total": total}


def get_filtered_detections(db: Session, status: str = None):

    query = db.query(Detection)

    if status:
        query = query.filter(Detection.status == status)

    return query.all()
