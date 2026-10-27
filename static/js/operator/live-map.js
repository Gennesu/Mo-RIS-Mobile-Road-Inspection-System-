const defaultCenter = [-6.2383, 107.0257];
const map = L.map("map", {zoomControl: false}).setView(defaultCenter, 16);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
}).addTo(map);

L.control.zoom({position: "bottomright"}).addTo(map);

let deviceMarker = null;
let accuracyCircle = null;
let latestLatLng = null;
let latestAccuracy = 0;
let isFollowingDevice = true;
let lastLocationSync = 0;
const locationSyncUrl = `${window.location.protocol}//${window.location.hostname}:8000/device-location`;

function setFollowButtonActive(isActive) {
    const button = document.getElementById("btn-location");
    if (button) button.classList.toggle("is-active", isActive);
}

function updateDeviceLocation(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy || 0;
    const latlng = [lat, lng];
    latestLatLng = latlng;
    latestAccuracy = accuracy;

    if (!deviceMarker) {
        deviceMarker = L.circleMarker(latlng, {
            radius: 8,
            color: "#ffffff",
            weight: 3,
            fillColor: "#2d87ff",
            fillOpacity: 1
        }).addTo(map).bindPopup("Lokasi perangkat");
    } else {
        deviceMarker.setLatLng(latlng);
    }

    if (!accuracyCircle) {
        accuracyCircle = L.circle(latlng, {
            radius: accuracy,
            color: "#2d87ff",
            weight: 1,
            fillColor: "#2d87ff",
            fillOpacity: 0.12
        }).addTo(map);
    } else {
        accuracyCircle.setLatLng(latlng);
        accuracyCircle.setRadius(accuracy);
    }

    if (isFollowingDevice) {
        map.setView(latlng, Math.max(map.getZoom(), 16));
    }

    syncDeviceLocation(lat, lng, accuracy);
}

function syncDeviceLocation(latitude, longitude, accuracy, force = false) {
    const now = Date.now();
    if (!force && now - lastLocationSync < 1000) return;
    lastLocationSync = now;

    fetch(locationSyncUrl, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({latitude, longitude, accuracy})
    }).catch(function (error) {
        console.error("Gagal mengirim lokasi perangkat.", error);
    });
}

function syncLatestDeviceLocation(force = false) {
    if (!latestLatLng) return;
    syncDeviceLocation(latestLatLng[0], latestLatLng[1], latestAccuracy, force);
}

function showLocationError(error) {
    const messages = {
        [error.PERMISSION_DENIED]: "Izin lokasi ditolak.",
        [error.POSITION_UNAVAILABLE]: "Lokasi tidak tersedia.",
        [error.TIMEOUT]: "GPS timeout."
    };
    console.error(messages[error.code] || "Gagal mengambil lokasi perangkat.");
}

if (navigator.geolocation) {
    map.on("dragstart", function () {
        isFollowingDevice = false;
        setFollowButtonActive(false);
    });

    document.addEventListener("click", function (event) {
        const button = event.target.closest && event.target.closest("#btn-location");
        if (!button) return;

        isFollowingDevice = true;
        setFollowButtonActive(true);

        if (latestLatLng) {
            map.setView(latestLatLng, Math.max(map.getZoom(), 16));
            return;
        }

        navigator.geolocation.getCurrentPosition(updateDeviceLocation, showLocationError, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    });

    setFollowButtonActive(true);
    navigator.geolocation.watchPosition(updateDeviceLocation, showLocationError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
    setInterval(function () {
        syncLatestDeviceLocation(true);
    }, 3000);
} else {
    console.error("Browser tidak mendukung Geolocation.");
}

window.operatorLocation = {
    syncNow: function () {
        syncLatestDeviceLocation(true);
    }
};
