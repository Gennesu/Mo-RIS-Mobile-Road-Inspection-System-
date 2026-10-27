// =========================
// Routing
// =========================

let routingControl = null;

function hideRoute() {
    if (routingControl) {
        window.map.removeControl(routingControl);
        routingControl = null;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const hideRouteBtn = document.getElementById("btn-hide-route");
    if (hideRouteBtn) hideRouteBtn.addEventListener("click", hideRoute);
});

function showRoute(destLat, destLng) {
    getCurrentLocation(
        function (userLat, userLng) {
            if (routingControl) window.map.removeControl(routingControl);

            routingControl = L.Routing.control({
                waypoints: [
                    L.latLng(userLat, userLng),
                    L.latLng(destLat, destLng)
                ],
                router: L.Routing.osrmv1({ language: "id" }),
                routeWhileDragging: false,
                addWaypoints: false,
                draggableWaypoints: false,
                fitSelectedRoutes: true,
                createMarker: function () {
                    return null;
                },
                lineOptions: {
                    styles: [{ color: "#0d6efd", weight: 6, opacity: 0.8 }]
                }
            }).addTo(window.map);

            routingControl.on("routingerror", function () {
                alert("Rute tidak dapat dibuat.");
            });
        },
        function (error) {
            const messages = {
                [error.PERMISSION_DENIED]: "Izin lokasi ditolak.",
                [error.POSITION_UNAVAILABLE]: "Lokasi tidak tersedia.",
                [error.TIMEOUT]: "GPS timeout."
            };
            alert(messages[error.code] || "Terjadi kesalahan mengambil lokasi.");
        }
    );
}
