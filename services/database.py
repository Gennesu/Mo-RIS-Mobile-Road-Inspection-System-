import os
from pathlib import Path

import mysql.connector


def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3307")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "moris"),
        charset="utf8mb4",
        use_pure=True,
    )


def fetch_potholes():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                d.detection_id AS id,
                d.label,
                d.length_cm,
                d.width_cm,
                d.area_cm2,
                d.image,
                d.latitude,
                d.longitude,
                d.status,
                d.detected_at,
                r.road_id AS road_id,
                r.name AS road_name
            FROM detections AS d
            LEFT JOIN roads AS r ON r.road_id = d.road_id
            WHERE d.latitude IS NOT NULL
              AND d.longitude IS NOT NULL
              AND d.verification_status = 'confirmed'
            ORDER BY d.detection_id DESC
        """)

        rows = cursor.fetchall()

        potholes = []
        for row in rows:
            length_cm = row.get("length_cm") or 0
            width_cm = row.get("width_cm") or 0
            area_cm2 = row.get("area_cm2") or 0

            # if area not provided, estimate from length * width
            try:
                if (not area_cm2) and length_cm and width_cm:
                    area_cm2 = float(length_cm) * float(width_cm)
            except Exception:
                area_cm2 = 0

            length_m = float(length_cm) / 100.0 if length_cm else 0.0
            width_m = float(width_cm) / 100.0 if width_cm else 0.0
            area_m2 = float(area_cm2) / 10000.0 if area_cm2 else 0.0

            location_name = row.get("road_name")
            if not location_name:
                location_name = f"Pothole #{row['id']}"
            else:
                location_name = str(location_name).strip()

            potholes.append(
                {
                    "id": row["id"],
                    "road_id": row.get("road_id") or None,
                    "lat": float(row["latitude"]),
                    "lng": float(row["longitude"]),
                    "location_name": location_name,
                    "status": row["status"] or "Menunggu Penanganan",
                    "time": row["detected_at"] or "-",
                    "image": row.get("image") or "",
                    "length_m": round(length_m, 2),
                    "width_m": round(width_m, 2),
                    "area_m2": area_m2,
                }
            )

        return potholes

    finally:
        cursor.close()
        conn.close()


def fetch_pothole_detail(detection_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                d.detection_id AS id,
                d.track_id,
                d.label,
                d.confidence,
                d.length_cm,
                d.width_cm,
                d.area_cm2,
                d.image,
                d.latitude,
                d.longitude,
                d.status,
                d.detected_at,
                d.created_at,
                r.name AS road_name
            FROM detections AS d
            LEFT JOIN roads AS r ON r.road_id = d.road_id
            WHERE d.detection_id = %s
              AND d.verification_status = 'confirmed'
            """,
            (detection_id,),
        )
        row = cursor.fetchone()
        if row is None:
            return None

        length_cm = float(row.get("length_cm") or 0)
        width_cm = float(row.get("width_cm") or 0)
        area_cm2 = float(row.get("area_cm2") or (length_cm * width_cm))
        image_path = str(row.get("image") or "").replace("\\", "/").lstrip("/")

        if image_path.lower().startswith("images/"):
            image_path = "assets/img/potholes/" + image_path[7:]
        elif image_path.lower().startswith("assets/potholes/"):
            image_path = "assets/img/potholes/" + image_path[len("assets/potholes/"):]
        elif image_path.lower().startswith("assets/cracks/"):
            image_path = "assets/img/cracks/" + image_path[len("assets/cracks/"):]

        return {
            **row,
            "location_name": row.get("road_name") or f"Pothole #{row['id']}",
            "status": row.get("status") or "Menunggu Penanganan",
            "length_cm": length_cm,
            "width_cm": width_cm,
            "area_cm2": area_cm2,
            "image_path": image_path or None,
        }
    finally:
        cursor.close()
        conn.close()


def fetch_priority_roads():
    """Return roads sorted by damage score from highest to lowest."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                road_id,
                name,
                damage_percentage
            FROM roads
            ORDER BY damage_percentage DESC, road_id ASC
            """)
        rows = cursor.fetchall()
        return [
            {
                "road_id": row["road_id"],
                "name": row["name"],
                "damage_percentage": float(row["damage_percentage"] or 0.0),
            }
            for row in rows
        ]
    finally:
        cursor.close()
        conn.close()


def fetch_dashboard_stats():
    """Return the summary figures displayed on the landing page."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT status FROM detections WHERE verification_status = 'confirmed'"
        )
        rows = cursor.fetchall()

        status_counts = {"pending": 0, "processing": 0, "completed": 0}

        for row in rows:
            status = row.get("status") or "Menunggu Penanganan"
            status_key = {
                "Menunggu Penanganan": "pending",
                "Sedang Ditangani": "processing",
                "Selesai Ditangani": "completed",
            }.get(status)
            if status_key:
                status_counts[status_key] += 1

        total = len(rows)
        return {
            "total": total,
            **status_counts,
        }
    finally:
        cursor.close()
        conn.close()


def fetch_detection_reviews():
    """Return detections awaiting an operator decision, newest first."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                detection_id AS id,
                track_id,
                label,
                confidence,
                length_cm,
                width_cm,
                image,
                latitude,
                longitude,
                status,
                verification_status,
                verifier_label,
                verifier_confidence,
                verification_note,
                detected_at,
                created_at
            FROM detections
            WHERE verification_status = 'pending_review'
            ORDER BY detection_id DESC
            """
        )
        rows = cursor.fetchall()

        for row in rows:
            image_path = str(row.get("image") or "").replace("\\", "/").lstrip("/")
            if image_path.lower().startswith("images/"):
                image_path = "assets/img/potholes/" + image_path[7:]
            elif image_path.lower().startswith("assets/potholes/"):
                image_path = "assets/img/potholes/" + image_path[len("assets/potholes/"):]
            elif image_path.lower().startswith("assets/cracks/"):
                image_path = "assets/img/cracks/" + image_path[len("assets/cracks/"):]
            row["image_path"] = image_path or None

        return rows
    finally:
        cursor.close()
        conn.close()


def fetch_confirmed_detections():
    """Return confirmed potholes for operator cleanup."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                detection_id AS id,
                label,
                confidence,
                length_cm,
                width_cm,
                image,
                latitude,
                longitude,
                status,
                verifier_label,
                verifier_confidence,
                verification_note,
                detected_at,
                verified_at
            FROM detections
            WHERE verification_status = 'confirmed'
              AND label = 'pothole'
            ORDER BY detection_id DESC
            """
        )
        rows = cursor.fetchall()

        for row in rows:
            image_path = str(row.get("image") or "").replace("\\", "/").lstrip("/")
            if image_path.lower().startswith("images/"):
                image_path = "assets/img/potholes/" + image_path[7:]
            elif image_path.lower().startswith("assets/potholes/"):
                image_path = "assets/img/potholes/" + image_path[len("assets/potholes/"):]
            elif image_path.lower().startswith("assets/cracks/"):
                image_path = "assets/img/cracks/" + image_path[len("assets/cracks/"):]
            row["image_path"] = image_path or None

        return rows
    finally:
        cursor.close()
        conn.close()


def delete_confirmed_detection(detection_id):
    """Delete one confirmed pothole and its matching static image, if present."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    image_path = None

    try:
        cursor.execute(
            """
            SELECT label, verification_status, image
            FROM detections
            WHERE detection_id = %s
            FOR UPDATE
            """,
            (detection_id,),
        )
        detection = cursor.fetchone()
        if detection is None:
            conn.rollback()
            return {"deleted": False, "reason": "not_found"}
        if (
            detection.get("label") != "pothole"
            or detection.get("verification_status") != "confirmed"
        ):
            conn.rollback()
            return {"deleted": False, "reason": "not_confirmed"}

        workspace_root = Path(__file__).resolve().parents[1]
        image_value = str(detection.get("image") or "").replace("\\", "/").lstrip("/")
        if image_value.lower().startswith("images/"):
            image_value = "assets/img/potholes/" + image_value[7:]
        elif image_value.lower().startswith("assets/potholes/"):
            image_value = "assets/img/potholes/" + image_value[len("assets/potholes/"):]

        candidate = (workspace_root / "static" / image_value).resolve()
        pothole_directory = (
            workspace_root / "static" / "assets" / "img" / "potholes"
        ).resolve()
        allowed_names = {
            f"pothole_{detection_id}.jpg",
            f"pothole_{detection_id}.jpeg",
            f"pothole_{detection_id}.png",
        }
        if candidate.parent == pothole_directory and candidate.name.lower() in allowed_names:
            image_path = candidate

        cursor.execute(
            """
            DELETE FROM detections
            WHERE detection_id = %s
              AND verification_status = 'confirmed'
              AND label = 'pothole'
            """,
            (detection_id,),
        )
        if cursor.rowcount != 1:
            conn.rollback()
            return {"deleted": False, "reason": "not_confirmed"}
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

    image_removed = False
    if image_path and image_path.is_file():
        try:
            image_path.unlink()
            image_removed = True
        except OSError as error:
            print(f"Gagal menghapus gambar {image_path.name}: {error}")

    return {"deleted": True, "image_removed": image_removed}


def fetch_operator_detection_feed(after_id=0, limit=6):
    """Read only detections created after the operator page's session watermark."""
    after_id = max(0, int(after_id or 0))
    limit = max(1, min(10, int(limit or 6)))
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                detection_id AS id,
                label,
                confidence,
                length_cm,
                width_cm,
                image,
                latitude,
                longitude,
                verification_status,
                verifier_label,
                verifier_confidence,
                detected_at
            FROM detections
            WHERE detection_id > %s
            ORDER BY detection_id DESC
            LIMIT %s
            """,
            (after_id, limit),
        )
        rows = cursor.fetchall()

        for row in rows:
            image_path = str(row.get("image") or "").replace("\\", "/").lstrip("/")
            if image_path.lower().startswith("images/"):
                image_path = "assets/img/potholes/" + image_path[7:]
            elif image_path.lower().startswith("assets/potholes/"):
                image_path = "assets/img/potholes/" + image_path[len("assets/potholes/"):]
            elif image_path.lower().startswith("assets/cracks/"):
                image_path = "assets/img/cracks/" + image_path[len("assets/cracks/"):]
            row["image_path"] = image_path or None

        return {
            "latest_id": max([after_id, *(int(row["id"]) for row in rows)]),
            "detections": rows,
        }
    finally:
        cursor.close()
        conn.close()


def update_detection_verification(detection_id, decision, note=None):
    """Record an operator's decision separately from repair progress."""
    status = {
        "confirm": "confirmed",
        "reject": "rejected",
    }.get(str(decision or "").strip().lower())
    if status is None:
        return False

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            UPDATE detections
            SET verification_status = %s,
                verification_note = %s,
                verified_at = CURRENT_TIMESTAMP
            WHERE detection_id = %s
            """,
            (status, str(note or "")[:500] or None, detection_id),
        )
        updated = cursor.rowcount > 0
        if not updated:
            cursor.execute(
                "SELECT detection_id FROM detections WHERE detection_id = %s",
                (detection_id,),
            )
            updated = cursor.fetchone() is not None
        conn.commit()
        return updated
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()
