const defaultCenter = [-6.2383, 107.0257];
const markerData = typeof potholes !== "undefined" && Array.isArray(potholes)
    ? potholes
    : [];
const initialCenter = markerData.length
    ? [markerData[0].lat, markerData[0].lng]
    : defaultCenter;

const map = L.map("map").setView(
    initialCenter,
    14
);

const map_source = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

L.tileLayer(map_source, {
    maxZoom: 19
}).addTo(map);

loadMarkers(map, markerData);

if (markerData.length > 1) {
    const bounds = L.latLngBounds(markerData.map((item) => [item.lat, item.lng]));
    map.fitBounds(bounds, {padding: [32, 32], maxZoom: 15});
}
