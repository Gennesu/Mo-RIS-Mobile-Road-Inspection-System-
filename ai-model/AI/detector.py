from ultralytics import YOLO
import cv2
import os
import time
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from threading import BoundedSemaphore, Event, Lock, Thread

import torch
from api_client import APIClient
from measurement import Measurement
from calibration import Calibration
from tracker import Tracker
from image_saver import ImageSaver
from gps import GPS
from verification import AIObjectVerifier


class LatestFrameReader:
    """Keep only the newest camera frame so slow inference cannot build a backlog."""

    def __init__(self, capture):
        self.capture = capture
        self.stop_event = Event()
        self.frame_lock = Lock()
        self.latest_frame = None
        self.sequence = 0
        self.thread = Thread(target=self._capture_loop, name="camera-capture", daemon=True)

    @property
    def stopped(self):
        return self.stop_event.is_set()

    def start(self):
        self.thread.start()
        return self

    def _capture_loop(self):
        failed_reads = 0
        while not self.stop_event.is_set():
            grabbed, frame = self.capture.read()
            if not grabbed:
                failed_reads += 1
                if failed_reads >= 50:
                    self.stop_event.set()
                    break
                self.stop_event.wait(0.02)
                continue

            failed_reads = 0
            with self.frame_lock:
                self.latest_frame = frame
                self.sequence += 1

    def read_latest(self, last_sequence, timeout=1.0):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline and not self.stop_event.is_set():
            with self.frame_lock:
                if self.latest_frame is not None and self.sequence != last_sequence:
                    return True, self.latest_frame.copy(), self.sequence
            self.stop_event.wait(0.005)

        return False, None, last_sequence

    def stop(self):
        self.stop_event.set()
        self.thread.join(timeout=2)
        self.capture.release()
        self.thread.join(timeout=1)


class RoadDetector:

    def __init__(self, model_path):
        # Leave CPU capacity available for Flask, the browser, and the API.
        cpu_threads = max(1, int(os.getenv("DETECT_TORCH_THREADS", "2")))
        opencv_threads = max(1, int(os.getenv("DETECT_OPENCV_THREADS", "1")))
        torch.set_num_threads(cpu_threads)
        cv2.setNumThreads(opencv_threads)
        try:
            torch.set_num_interop_threads(1)
        except RuntimeError:
            pass

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
        self.last_preview_at = 0.0
        self.preview_interval = float(os.getenv("DETECTION_PREVIEW_INTERVAL", "0.2"))
        self.preview_max_width = int(os.getenv("DETECTION_PREVIEW_WIDTH", "640"))
        self.preview_jpeg_quality = int(os.getenv("DETECTION_PREVIEW_QUALITY", "75"))
        # 384 is materially faster on CPU; DETECT_IMGSZ=512 restores the
        # previous accuracy-oriented setting when a scene needs more detail.
        self.inference_size = int(os.getenv("DETECT_IMGSZ", "384"))
        self.max_inference_fps = max(0.0, float(os.getenv("DETECT_MAX_FPS", "10")))
        self.inference_interval = (
            1.0 / self.max_inference_fps if self.max_inference_fps > 0 else 0.0
        )
        self.api_executor = ThreadPoolExecutor(
            max_workers=1,
            thread_name_prefix="detection-api",
        )
        self.verification_executor = ThreadPoolExecutor(
            max_workers=1,
            thread_name_prefix="detection-verifier",
        )
        self.verification_slots = BoundedSemaphore(value=2)
        self.verifier = AIObjectVerifier()
        self.confidence_threshold = float(os.getenv("DETECT_CONF", "0.4"))
        self.camera_width = int(os.getenv("CAMERA_WIDTH", "1280"))
        self.camera_height = int(os.getenv("CAMERA_HEIGHT", "720"))
        print(
            "Detector settings: "
            f"conf={self.confidence_threshold}, imgsz={self.inference_size}, "
            f"torch_threads={cpu_threads}, opencv_threads={opencv_threads}, "
            f"max_fps={self.max_inference_fps or 'unlimited'}"
        )

    def write_preview(self, frame):
        if not self.preview_path:
            return

        now = time.monotonic()
        if now - self.last_preview_at < self.preview_interval:
            return
        self.last_preview_at = now

        base_preview_path = Path(self.preview_path)
        preview_path = base_preview_path.with_name(
            f"{base_preview_path.stem}-{self.preview_index % 3}{base_preview_path.suffix}"
        )
        self.preview_index += 1

        preview_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = preview_path.with_suffix(".tmp.jpg")

        height, width = frame.shape[:2]
        preview = frame
        if width > self.preview_max_width:
            preview_height = round(height * self.preview_max_width / width)
            preview = cv2.resize(
                frame,
                (self.preview_max_width, preview_height),
                interpolation=cv2.INTER_AREA,
            )

        try:
            if cv2.imwrite(
                str(temp_path),
                preview,
                [cv2.IMWRITE_JPEG_QUALITY, self.preview_jpeg_quality],
            ):
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
            conf=self.confidence_threshold,
            imgsz=self.inference_size,
            verbose=False,
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

    @staticmethod
    def make_verification_crop(frame, bbox):
        height, width = frame.shape[:2]
        x1, y1, x2, y2 = bbox
        padding_x = max(4, int((x2 - x1) * 0.1))
        padding_y = max(4, int((y2 - y1) * 0.1))
        x1 = max(0, x1 - padding_x)
        y1 = max(0, y1 - padding_y)
        x2 = min(width, x2 + padding_x)
        y2 = min(height, y2 + padding_y)
        if x2 <= x1 or y2 <= y1:
            return None
        return frame[y1:y2, x1:x2].copy()

    def persist_detection_and_schedule_verification(self, detection, crop):
        saved_detection = self.api.send_detection(detection)
        if not isinstance(saved_detection, dict):
            return

        detection_id = saved_detection.get("detection_id")
        if not detection_id or crop is None:
            return

        if not self.verification_slots.acquire(blocking=False):
            print(f"Antrean verifikasi penuh, deteksi #{detection_id} menunggu operator.")
            return

        try:
            self.verification_executor.submit(
                self.verify_and_save_result,
                detection_id,
                crop,
            )
        except RuntimeError:
            self.verification_slots.release()
            print(f"Verifikasi AI dilewati untuk deteksi #{detection_id}.")

    def verify_and_save_result(self, detection_id, crop):
        try:
            result = self.verifier.verify(crop)
            self.api.send_ai_verification(detection_id, result)
        finally:
            self.verification_slots.release()

    def start_camera(self):
        cap = cv2.VideoCapture(1, cv2.CAP_DSHOW)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.camera_width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.camera_height)
        cap.set(cv2.CAP_PROP_FPS, 30)

        if not cap.isOpened():
            print("Camera is not available to the detector.")
            cap.release()
            self.api_executor.shutdown(wait=True)
            self.verification_executor.shutdown(wait=True)
            return

        actual_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"Camera capture size: {actual_width}x{actual_height}")

        reader = LatestFrameReader(cap).start()
        last_sequence = 0
        skipped_frames = 0
        next_inference_at = 0.0

        try:
            while not reader.stopped:
                wait_time = next_inference_at - time.monotonic()
                if wait_time > 0:
                    time.sleep(wait_time)

                inference_started_at = time.monotonic()
                ret, frame, sequence = reader.read_latest(last_sequence)
                if not ret:
                    continue

                skipped_frames += max(0, sequence - last_sequence - 1)
                last_sequence = sequence
                result_frame, detections = self.detect_frame(frame)

                for detection in detections:
                    if detection["track_id"] != -1 and self.tracker.is_new(detection["track_id"]):
                        image_url = self.image_saver.save(
                            result_frame,
                            detection["track_id"],
                            detection["label"],
                        )
                        detection["image"] = image_url
                        verification_crop = self.make_verification_crop(
                            frame,
                            detection["bbox"],
                        )
                        self.api_executor.submit(
                            self.persist_detection_and_schedule_verification,
                            detection.copy(),
                            verification_crop,
                        )

                    x1, y1, x2, y2 = detection["bbox"]
                    text = (
                        f"P:{detection['length_cm']}cm "
                        f"L:{detection['width_cm']}cm"
                    )
                    cv2.putText(
                        result_frame,
                        text,
                        (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0, 255, 255),
                        2,
                    )

                self.write_preview(result_frame)

                if self.show_window:
                    cv2.imshow("RoadGuard AI", result_frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                    if cv2.getWindowProperty("RoadGuard AI", cv2.WND_PROP_VISIBLE) < 1:
                        break

                if self.inference_interval:
                    next_inference_at = inference_started_at + self.inference_interval
        finally:
            reader.stop()
            self.api_executor.shutdown(wait=True)
            self.verification_executor.shutdown(wait=True)
            if self.show_window:
                cv2.destroyAllWindows()
            print(f"Frames skipped to keep preview current: {skipped_frames}")
