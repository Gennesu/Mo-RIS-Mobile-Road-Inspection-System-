class SeverityAnalyzer:

    def __init__(self):
        pass

    def calculate(self, length_cm, width_cm):
        largest_dimension = max(length_cm, width_cm)

        if largest_dimension < 30:
            return "Ringan"

        elif largest_dimension < 60:
            return "Sedang"

        else:
            return "Parah"