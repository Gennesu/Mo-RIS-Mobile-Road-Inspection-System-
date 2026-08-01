"""Perkiraan lokasi perangkat berdasarkan alamat IP publik.

Metode ini memerlukan koneksi internet dan tidak setara dengan GPS perangkat.
Koordinat dapat berada pada level kota atau lokasi penyedia internet.
"""

from time import monotonic

import requests


class GPS:
    """Mengambil lokasi berbasis IP dan menyimpannya sementara dalam cache."""

    def __init__(self, cache_seconds=300):
        # Jangan meminta layanan geolokasi pada setiap frame video.
        self.cache_seconds = cache_seconds
        self._location = {"latitude": None, "longitude": None}
        self._last_lookup = None
        # Abaikan proxy dari environment. Pada komputer ini proxy mengarah ke
        # 127.0.0.1:9, padahal tidak ada server proxy yang berjalan di sana.
        self._session = requests.Session()
        self._session.trust_env = False

    def get_location(self):
        """Kembalikan latitude/longitude perkiraan dari koneksi Wi-Fi/IP.

        Jika internet atau layanan geolokasi tidak tersedia, nilai ``None``
        dikembalikan agar proses deteksi jalan tetap berjalan.
        """
        now = monotonic()

        if (
            self._last_lookup is not None
            and now - self._last_lookup < self.cache_seconds
        ):
            return self._location.copy()

        services = (
            ("https://ipapi.co/json/", "latitude", "longitude"),
            ("https://ipwho.is/", "latitude", "longitude"),
        )

        for url, latitude_key, longitude_key in services:
            try:
                response = self._session.get(url, timeout=5)
                response.raise_for_status()
                data = response.json()
                latitude = data.get(latitude_key)
                longitude = data.get(longitude_key)

                if latitude is not None and longitude is not None:
                    self._location = {
                        "latitude": float(latitude),
                        "longitude": float(longitude),
                    }
                    print("Lokasi perkiraan berhasil diambil melalui IP.")
                    break

            except (requests.RequestException, TypeError, ValueError) as error:
                print(f"Layanan lokasi tidak dapat diakses ({url}): {error}")
        else:
            print("Lokasi IP tidak tersedia. Periksa koneksi internet.")

        self._last_lookup = now
        return self._location.copy()
