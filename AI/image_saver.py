import cv2
import os


class ImageSaver:

    def __init__(self):
        self.folder = "images"

        os.makedirs(
            self.folder,
            exist_ok=True
        )

    def save(self, frame, track_id, label):

        filename = f"{label}_{track_id}.jpg"

        filepath = os.path.join(
            self.folder,
            filename
        )

        cv2.imwrite(filepath, frame)

        return filepath