import cv2
import numpy as np


class Measurement:

    def __init__(self):
        pass

    def calculate(self, frame, bbox):
        """
        Menghitung panjang, lebar, dan luas lubang
        berdasarkan kontur pada area hasil deteksi YOLO.
        """

        x1, y1, x2, y2 = bbox

        roi = frame[y1:y2, x1:x2]

        if roi.size == 0:
            return None

        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

        blur = cv2.GaussianBlur(gray, (5, 5), 0)

        _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        kernel = np.ones((3, 3), np.uint8)

        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)

        contours, _ = cv2.findContours(
            thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        if len(contours) == 0:
            return None

        contour = max(contours, key=cv2.contourArea)

        area_pixel = cv2.contourArea(contour)

        x, y, w, h = cv2.boundingRect(contour)

        contour_shift = contour.copy()

        contour_shift[:, :, 0] += x1
        contour_shift[:, :, 1] += y1

        return {"length_pixel": h, "width_pixel": w, "contour": contour_shift}
