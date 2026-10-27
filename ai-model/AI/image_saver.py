import os
from pathlib import Path

import cv2


class ImageSaver:

    def __init__(self):
        workspace_root = Path(__file__).resolve().parents[2]
        self.folder = workspace_root / "static" / "assets" / "img"
        self.base_path = "assets/img"

        self.folder.mkdir(parents=True, exist_ok=True)

    def save(self, frame, track_id, label):
        safe_label = str(label).replace(" ", "_").lower()
        folder_name = "potholes" if safe_label == "pothole" else "cracks"

        label_folder = self.folder / folder_name
        label_folder.mkdir(parents=True, exist_ok=True)

        filename = f"tmp_{track_id}.jpg"
        filepath = label_folder / filename
        cv2.imwrite(str(filepath), frame)

        return f"{self.base_path}/{folder_name}/{filename}"