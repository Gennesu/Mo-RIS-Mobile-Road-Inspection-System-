import cv2
import json

REFERENCE_WIDTH_CM = 8.56   # contoh kartu ATM/KTP
camera = cv2.VideoCapture(0)

points = []

def mouse(event, x, y, flags, param):
    global points

    if event == cv2.EVENT_LBUTTONDOWN:
        points.append((x, y))

        if len(points) == 2:
            pixel = abs(points[1][0] - points[0][0])

            pixel_to_cm = REFERENCE_WIDTH_CM / pixel

            data = {
                "pixel_to_cm": pixel_to_cm
            }

            with open("calibration.json", "w") as f:
                json.dump(data, f, indent=4)

            print("Kalibrasi selesai")
            print("Pixel :", pixel)
            print("Ratio :", pixel_to_cm)

while True:

    ret, frame = camera.read()

    if not ret:
        break

    cv2.imshow("Calibration", frame)
    cv2.setMouseCallback("Calibration", mouse)

    if cv2.waitKey(1) == ord("q"):
        break

camera.release()
cv2.destroyAllWindows()