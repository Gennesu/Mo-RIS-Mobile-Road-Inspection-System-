from ultralytics import YOLO
import cv2
import os
from datetime import datetime
from pathlib import Path
from api_client import APIClient
from measurement import Measurement
from calibration import Calibration
from tracker import Tracker
from image_saver import ImageSaver
from gps import GPS


class RoadDetector:

    def __init__(self, model_path):
        # Memuat model AI
        self.model = YOLO(model_path)
        self.api = APIClient()
        self.measurement = Measurement()
        self.calibration = Calibration()
        self.tracker = Tracker()
        self.image_saver = ImageSaver()
        self.gps = GPS()
        self.preview_path = os.getenv("DETECTION_PREVIEW_PATH")
        self.show_window = os.getenv("SHOW_DETECT_WINDOW", "1") != "0"
        self.preview_index = 0
        self.confidence_threshold = float(os.getenv("DETECT_CONF", "0.4"))
        self.camera_width = int(os.getenv("CAMERA_WIDTH", "1280"))
        self.camera_height = int(os.getenv("CAMERA_HEIGHT", "720"))
        print(f"Detector confidence threshold: {self.confidence_threshold}")

    def write_preview(self, frame):
        if not self.preview_path:
            return

        base_preview_path = Path(self.preview_path)
        preview_path = base_preview_path.with_name(
            f"{base_preview_path.stem}-{self.preview_index % 3}{base_preview_path.suffix}"
        )
        self.preview_index += 1

        preview_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = preview_path.with_suffix(".tmp.jpg")

        try:
            if cv2.imwrite(str(temp_path), frame):
                os.replace(temp_path, preview_path)
        except PermissionError:
            print(f"Preview sedang dibaca browser, frame dilewati: {preview_path}")
        finally:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except PermissionError:
                    pass

    def detect_frame(self, frame):
        """
        Mendeteksi jalan rusak pada satu frame
        """
        results = self.model.track(
            frame,
            persist=True,
            tracker="bytetrack.yaml",
            conf=self.confidence_threshold
        )

        detections = []

        for result in results:
            boxes = result.boxes

            for box in boxes:
                track_id = -1
                
                if box.id is not None:
                    track_id = int(box.id.item())
                
                x1, y1, x2, y2 = map(int, box.xyxy[0])

                confidence = float(box.conf[0])

                class_id = int(box.cls[0])

                label = self.model.names[class_id]
                
                measurement = self.measurement.calculate(frame,[x1, y1, x2, y2])

                if measurement is None:
                    measurement = {
                        "length_pixel": y2 - y1,
                        "width_pixel": x2 - x1,
                    }
                
                length_cm = self.calibration.pixel_to_cm(measurement["length_pixel"])
                
                width_cm = self.calibration.pixel_to_cm(measurement["width_pixel"])
                
                location = self.gps.get_location()
                
                detections.append({
                    "track_id": track_id,
                    "label": label,
                    "confidence": round(confidence * 100, 2),
                    "bbox": [x1, y1, x2, y2],
                    "length_cm": length_cm,
                    "width_cm": width_cm,
                    "image": None,
                    "latitude": location["latitude"],
                    "longitude": location["longitude"],
                    "status": "Menunggu Penanganan",
                    "detected_at": datetime.now().strftime("%d-%m-%Y %H:%M:%S")
                    })
                print("track id:", track_id)

        annotated_frame = results[0].plot()

        return annotated_frame, detections

    def start_camera(self):
        cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.camera_width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.camera_height)
        cap.set(cv2.CAP_PROP_FPS, 30)

        actual_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"Camera capture size: {actual_width}x{actual_height}")

        while True:

            ret, frame = cap.read()

            if not ret:
                break

            result_frame, detections = self.detect_frame(frame)

            # Cetak hasil ke terminal
            for d in detections:
                
                print("=" * 40)
                print("Jenis       :", d["label"])
                print("Confidence  :", d["confidence"], "%")
                print("BBox        :", d["bbox"])
                print("Panjang     :", d["length_cm"], "cm")
                print("Lebar       :", d["width_cm"], "cm")
                print("Tanggal     :", d["detected_at"])
                
                if d["track_id"] != -1:
                    if self.tracker.is_new(d["track_id"]):
                        image_url = self.image_saver.save(result_frame, d["track_id"], d["label"])
                        d["image"] = image_url
                        self.api.send_detection(d)          
                
            for d in detections:
                x1, y1, x2, y2 = d["bbox"]
                text = (
                    f"P:{d['length_cm']}cm "
                    f"L:{d['width_cm']}cm"
                    )

                cv2.putText(
                result_frame,
                text,
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 255),
                2
            )
            self.write_preview(result_frame)

            if self.show_window:
                cv2.imshow("RoadGuard AI", result_frame)

                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

                if cv2.getWindowProperty("RoadGuard AI", cv2.WND_PROP_VISIBLE) < 1:
                    break

        cap.release()
        if self.show_window:
            cv2.destroyAllWindows()
