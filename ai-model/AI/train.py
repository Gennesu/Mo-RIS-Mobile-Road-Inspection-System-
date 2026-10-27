from ultralytics import YOLO

# Memuat model YOLOv8 nano
model = YOLO("yolov8n.pt")

# Melatih model
model.train(
    data="AI/dataset/data.yaml",
    epochs=50,
    imgsz=640,
    batch=8,
    name="PODCAST"
)