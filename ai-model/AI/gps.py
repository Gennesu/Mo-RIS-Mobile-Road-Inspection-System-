"""Ambil lokasi dari sumber GPS perangkat."""

import os
from time import monotonic

import requests


class GPS:
    """Mengambil lokasi dari endpoint GPS perangkat yang diset pada environment."""

    def __init__(self, cache_seconds=1):
        self.cache_seconds = cache_seconds
        self._location = {"latitude": None, "longitude": None}
        self._last_lookup = None
        self._session = requests.Session()
        self._session.trust_env = False

    def get_location(self):
        """Kembalikan latitude/longitude dari GPS perangkat jika tersedia.

        Jika endpoint perangkat tidak tersedia, nilai ``None`` dikembalikan agar
        pipeline deteksi tetap berjalan tanpa crash.
        """
        now = monotonic()

        if (
            self._last_lookup is not None
            and now - self._last_lookup < self.cache_seconds
        ):
            return self._location.copy()

        device_gps_url = os.getenv(
            "DEVICE_GPS_URL",
            "http://127.0.0.1:8000/device-location"
        )

        try:
            response = self._session.get(device_gps_url, timeout=5)
            response.raise_for_status()
            data = response.json()

            latitude = data.get("latitude") or data.get("lat")
            longitude = data.get("longitude") or data.get("lon") or data.get("lng")

            if latitude is not None and longitude is not None:
                self._location = {
                    "latitude": float(latitude),
                    "longitude": float(longitude),
                }
                print("Lokasi perangkat berhasil diambil.")

        except (requests.RequestException, TypeError, ValueError) as error:
            print(f"GPS perangkat tidak dapat diakses ({device_gps_url}): {error}")

        self._last_lookup = now
        return self._location.copy()
