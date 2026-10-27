from detector import RoadDetector

detector = RoadDetector("../bestv4.pt")

detector.start_camera()





# from ultralytics import YOLO
# import cv2

# model = YOLO("../runs/detect/PODCAST-6/weights/best (2).pt"
# results = model.predict(
#     source="assets/vidjal.mp4",
#     show=True,
#     save=True
# )

# img = results[0].plot()

# cv2.imshow("Hasil Deteksi", img)
# cv2.waitKey(0)          # Tunggu sampai tombol keyboard ditekan
# cv2.destroyAllWindows()
