function focusMarker(marker, map, latlng) {
    if (!marker || !map) return;

    const targetLatLng = latlng || marker.getLatLng();
    marker.openPopup();

    setTimeout(() => {
        try {
            const size = map.getSize();
            const markerPoint = map.latLngToContainerPoint(targetLatLng);

            // place marker slightly below center so popup (above marker) appears centered
            const desiredMarkerPoint = L.point(size.x * 0.7, size.y * 0.71);

            // delta in pixels to move the current marker to desired marker point
            const delta = markerPoint.subtract(desiredMarkerPoint);

            // current center in container pixels
            const centerPoint = L.point(size.x / 2, size.y / 2);

            // new center in container pixels
            const newCenterPoint = centerPoint.add(delta);

            const newCenterLatLng = map.containerPointToLatLng(newCenterPoint);
            map.panTo(newCenterLatLng, {animate: true});
        } catch (err) {
            // fallback: simple pan to marker
            map.panTo(targetLatLng, {animate: true});
        }
    }, 50);
}

window.focusMarker = focusMarker;

function loadMarkers(map, potholesData) {
    const markers = new Map();

    potholesData.forEach((item) => {
        const marker = L.marker([item.lat, item.lng], {
            icon: createMarker()
        })
            .addTo(map)
            .bindPopup(createPopup(item));

        // center map on marker when clicked, with vertical offset so popup appears centered
        marker.on('click', function (e) {
            focusMarker(marker, map, e.latlng);
        });

        markers.set(item.id, marker);
    });

    window.markerById = markers;
    window.map = map;
}

function createMarker() {
    return L.divIcon({
        className: "custom-marker",

        html: `
            <svg width="30" height="36" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M16 0
                       C7.2 0 0 7.2 0 16
                       C0 28.5 16 42 16 42
                       C16 42 32 28.5 32 16
                       C32 7.2 24.8 0 16 0Z"
                    fill="#FD884B"
                    stroke="#ffffff"
                    stroke-width="2"
                />

                <circle cx="16" cy="16" r="6" fill="#ffffff"
                />
            </svg>
        `,

        iconSize: [34, 46],
        iconAnchor: [17, 42],
        popupAnchor: [0, -36]

    });

}

