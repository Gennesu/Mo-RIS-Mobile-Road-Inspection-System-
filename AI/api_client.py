import requests


class APIClient:

    def __init__(self):
        self.url = "http://127.0.0.1:8000/detections"

    def send_detection(self, data):

        try:

            response = requests.post(
                self.url,
                json=data,
                timeout=5
            )

            print("✅ Data berhasil dikirim")

            return response.json()

        except Exception as e:

            print("❌ Gagal mengirim :", e)