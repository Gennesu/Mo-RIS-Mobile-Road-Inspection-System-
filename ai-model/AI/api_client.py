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
            response.raise_for_status()

            print("Data berhasil dikirim")
            return response.json()

        except Exception as e:
            print("Gagal mengirim:", e)
            if "response" in locals():
                print("Status:", response.status_code)
                print("Response:", response.text)
            return None

    def send_ai_verification(self, detection_id, result):
        try:
            response = requests.put(
                f"{self.url}/{detection_id}/ai-verification",
                json=result,
                timeout=5,
            )
            response.raise_for_status()
            return response.json()
        except Exception as error:
            print(f"Gagal menyimpan hasil verifikasi AI #{detection_id}: {error}")
            return None
