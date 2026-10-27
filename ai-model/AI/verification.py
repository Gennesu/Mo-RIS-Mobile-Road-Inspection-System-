import os
from pathlib import Path
from threading import Lock

from ultralytics import YOLO


class AIObjectVerifier:
    """Use the local pothole/crack model to cross-check one detected crop."""

    def __init__(self):
        project_root = Path(__file__).resolve().parents[2]
        configured_path = os.getenv("DETECT_VERIFIER_MODEL")
        if configured_path:
            model_path = Path(configured_path)
            if not model_path.is_absolute():
                model_path = project_root / model_path
        else:
            model_path = (
                project_root
                / "ai-model"
                / "runs"
                / "detect"
                / "PODCAST-6"
                / "weights"
                / "bestv7.pt"
            )

        self.model_path = model_path
        self.inference_size = int(os.getenv("DETECT_VERIFIER_IMGSZ", "384"))
        self.model = None
        self.model_lock = Lock()

    def verify(self, crop):
        if crop is None or crop.size == 0:
            return {"label": "unknown", "confidence": None}

        if not self.model_path.is_file():
            print(f"AI verifier model tidak ditemukan: {self.model_path}")
            return {"label": "unavailable", "confidence": None}

        try:
            with self.model_lock:
                if self.model is None:
                    self.model = YOLO(str(self.model_path))

                result = self.model.predict(
                    crop,
                    imgsz=self.inference_size,
                    device="cpu",
                    conf=0.1,
                    max_det=3,
                    verbose=False,
                    save=False,
                )[0]

            if result.boxes is None or len(result.boxes) == 0:
                return {"label": "unknown", "confidence": None}

            best_box = max(result.boxes, key=lambda box: float(box.conf[0]))
            class_id = int(best_box.cls[0])
            label = str(self.model.names.get(class_id, "unknown")).strip().lower()
            confidence = round(float(best_box.conf[0]) * 100, 2)
            if label not in {"pothole", "crack"}:
                label = "unknown"

            return {"label": label, "confidence": confidence}
        except Exception as error:
            print(f"AI verifier gagal memeriksa crop: {error}")
            return {"label": "unavailable", "confidence": None}
