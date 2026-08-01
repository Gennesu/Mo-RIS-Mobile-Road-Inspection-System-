from ultralytics import YOLO
import cv2
from datetime import datetime
from severity import SeverityAnalyzer
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
        self.severity = SeverityAnalyzer()
        self.api = APIClient()
        self.measurement = Measurement()
        self.calibration = Calibration()
        self.tracker = Tracker()
        self.image_saver = ImageSaver()
        self.gps = GPS()

    def detect_frame(self, frame):
        """
        Mendeteksi jalan rusak pada satu frame
        """
        results = self.model.track(
            frame,
            persist=True,
            tracker="bytetrack.yaml",
            conf=0.4
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
                    continue
                
                length_cm = self.calibration.pixel_to_cm(measurement["length_pixel"])
                
                width_cm = self.calibration.pixel_to_cm(measurement["width_pixel"])

                area_cm2 = self.calibration.pixel_area_to_cm2(measurement["area_pixel"])
                
                level = self.severity.calculate(area_cm2)
                
                location = self.gps.get_location()
                
                detections.append({
                    "track_id": track_id,
                    "label": label,
                    "confidence": round(confidence * 100, 2),
                    "bbox": [x1, y1, x2, y2],
                    #"length_pixel": measurement["length_pixel"],
                    #"width_pixel": measurement["width_pixel"],
                    #"area_pixel": measurement["area_pixel"],
                    "length_cm": length_cm,
                    "width_cm": width_cm,
                    "area_cm2": area_cm2,
                    "severity": level,
                    "image": None,
                    "latitude": location["latitude"],
                    "longitude": location["longitude"],
                    "status": "Belum di tangani",
                    "detected_at": datetime.now().strftime("%d-%m-%Y %H:%M:%S")
                    })
                print("track id:", track_id)

        annotated_frame = results[0].plot()

        return annotated_frame, detections

    def start_camera(self):
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

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
                print("Luas        :", d["area_cm2"], "cm²")
                print("Keparahan   :", d["severity"])
                print("Tanggal     :", d["detected_at"])
                
                if d["track_id"] != -1:
                    if self.tracker.is_new(d["track_id"]):
                        image_path = self.image_saver.save(result_frame, d["track_id"], d["label"])
                        d["image"] = image_path
                        self.api.send_detection(d)          
                
            for d in detections:
                x1, y1, x2, y2 = d["bbox"]
                text = (
                    f"P:{d['length_cm']}cm "
                    f"L:{d['width_cm']}cm "
                    f"A:{d['area_cm2']}cm2"
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
                

            cv2.imshow("RoadGuard AI", result_frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

            if cv2.getWindowProperty("RoadGuard AI", cv2.WND_PROP_VISIBLE) < 1:
                break

        cap.release()
        cv2.destroyAllWindows()