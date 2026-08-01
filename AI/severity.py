class SeverityAnalyzer:

    def __init__(self):
        pass

    def calculate(self, area_cm2):

        if area_cm2 < 500:
            return "Ringan"

        elif area_cm2 < 1500:
            return "Sedang"

        else:
            return "Parah"