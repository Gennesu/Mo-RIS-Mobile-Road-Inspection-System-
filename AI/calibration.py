import json


class Calibration:

    def __init__(self):

        with open("calibration.json") as f:
            data = json.load(f)

        self.pixel_to_cm_ratio = data["pixel_to_cm"]

    def pixel_to_cm(self, pixel):

        return round(pixel * self.pixel_to_cm_ratio, 2)

    def pixel_area_to_cm2(self, area_pixel):

        return round(area_pixel * (self.pixel_to_cm_ratio ** 2), 2)