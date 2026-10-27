import os
import mysql.connector


def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
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
        cursor.execute("SELECT status FROM detections")
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
