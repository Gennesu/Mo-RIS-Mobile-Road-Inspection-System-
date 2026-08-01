import cv2
from measurement import Measurement

img = cv2.imread("assets/test.jpg")

bbox = [120, 180, 420, 420]   # contoh

measure = Measurement()

result = measure.calculate(img, bbox)

print(result)