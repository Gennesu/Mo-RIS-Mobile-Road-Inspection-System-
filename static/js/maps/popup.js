function createPopup(item) {
    function formatLengthDisplay(value) {
        const numericValue = Number(value ?? 0);
        if (numericValue < 1) {
            return `${(numericValue * 100).toFixed(2)} cm`;
        }
        return `${numericValue.toFixed(2)} m`;
    }

    function formatAreaDisplay(value) {
        const numericValue = Number(value ?? 0);
        if (numericValue < 1) {
            return `${(numericValue * 10000).toFixed(2)} cm²`;
        }
        return `${numericValue.toFixed(2)} m²`;
    }

    const imgPath = item.image
        ? String(item.image).replaceAll('\\', '/').replaceAll('\\', '/')
        : "";

    const normalizedImage = imgPath
        .replace(/\\/g, "/")
        .replace(/^\.*\/*/, "")
        .replace(/^images\//i, "assets/img/potholes/")
        .replace(/^assets\/potholes\//i, "assets/img/potholes/")
        .replace(/^assets\/cracks\//i, "assets/img/cracks/")
        .replace(/^assets\/img\//i, "assets/img/");

    const imgSrc = normalizedImage ? `/static/${normalizedImage}` : "";

    return `
        <div class="popup-card">
            ${imgSrc ? `<div class="popup-image"><img src="${imgSrc}" alt="Pothole ${item.id}"/></div>` : ""}

            <div class="popup-header">
                <h3>${item.location_name}</h3>
            </div>

            <div class="popup-body">
                <div class="popup-row">
                    <span>📏 Panjang</span>
                    <strong>${formatLengthDisplay(item.length_m)}</strong>
                </div>

                <div class="popup-row">
                    <span>📐 Lebar</span>
                    <strong>${formatLengthDisplay(item.width_m)}</strong>
                </div>

                <div class="popup-row">
                    <span>🧭 Luas Kerusakan</span>
                    <strong>${formatAreaDisplay(item.area_m2)}</strong>
                </div>

                <div class="popup-row">
                    <span>🕒 Terdeteksi</span>
                    <strong>${item.time ?? "-"}</strong>
                </div>
            </div>

            <div class="popup-actions">
                <button class="popup-route" onclick="showRoute(${item.lat}, ${item.lng})">Rute ke Lokasi</button>
                <a class="popup-detail" href="/pothole/${item.id}">Lihat Detail</a>
            </div>
        </div>
    `;
}






