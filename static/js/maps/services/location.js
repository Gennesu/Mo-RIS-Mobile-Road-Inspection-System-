// =========================
// Current Location
// =========================

window.userMarker = null;

function updateUserMarker(lat, lng) {
    if (window.userMarker) {
        window.userMarker.setLatLng([lat, lng]);
        return;
    }

    window.userMarker = L.marker([lat, lng])
        .addTo(window.map)
        .bindPopup("📍 Lokasi Anda");
}

function getCurrentLocation(onSuccess, onError) {
    if (!navigator.geolocation) {
        alert("Browser tidak mendukung Geolocation.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            updateUserMarker(lat, lng);
            if (onSuccess) onSuccess(lat, lng);
            else window.map.setView([lat, lng], 16);
        },
        function (error) {
            if (onError) onError(error);
            else {
                alert("Gagal mendapatkan lokasi.");
                console.error(error);
            }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

document.addEventListener("click", function onDocClick(event) {
    const button = event.target.closest && event.target.closest("#btn-location");
    if (!button) return;

    document.removeEventListener("click", onDocClick);
    getCurrentLocation();
});
