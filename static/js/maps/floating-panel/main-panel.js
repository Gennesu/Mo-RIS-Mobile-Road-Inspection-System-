let activePriorityRoad = null;

function restoreAllMapMarkers() {
    if (!window.markerById || !window.map) return;

    window.markerById.forEach((marker) => {
        if (!window.map.hasLayer(marker)) {
            marker.addTo(window.map);
        }
    });

    activePriorityRoad = null;
}

function focusRoadById(roadId) {
    if (!window.markerById || !window.map || !roadId) return;

    const numericRoadId = Number(roadId);
    if (activePriorityRoad === numericRoadId) {
        restoreAllMapMarkers();
        return;
    }

    const roadMarkers = potholes.filter((p) => Number(p.road_id) === numericRoadId);
    if (!roadMarkers.length) return;

    window.markerById.forEach((marker, id) => {
        const pothole = potholes.find((p) => p.id === Number(id));
        const shouldShow = pothole && Number(pothole.road_id) === numericRoadId;

        if (shouldShow) {
            if (!window.map.hasLayer(marker)) {
                marker.addTo(window.map);
            }
        } else if (window.map.hasLayer(marker)) {
            window.map.removeLayer(marker);
        }
    });

    const bounds = L.latLngBounds(roadMarkers.map((p) => [p.lat, p.lng]));
    window.map.flyToBounds(bounds, {
        padding: [40, 40],
        maxZoom: 16,
    });

    activePriorityRoad = numericRoadId;
}

function bindPriorityRoadButtons() {
    document.querySelectorAll(".priority-road").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".priority-road").forEach((item) => item.classList.remove("active"));
            btn.classList.add("active");

            if (btn.dataset.roadId) {
                focusRoadById(btn.dataset.roadId);
                return;
            }

            const marker = window.markerById?.get(Number(btn.dataset.id));
            if (!marker || !window.map) return;

            const latlng = marker.getLatLng();
            window.map.flyTo([latlng.lat, latlng.lng], 16, {
                duration: 0.8
            });

            if (typeof window.focusMarker === 'function') {
                window.focusMarker(marker, window.map, latlng);
            } else {
                marker.openPopup();
            }
        });
    });
}

function renderWelcomePanel() {
    document.getElementById("panel-content").innerHTML = `
        <div class="welcome-panel">
            <h2>Mo-RIS</h2>
            <p>Mobile Road Inspection System</p>
            <hr>
            <p>Select a marker to see pothole details.</p>
        </div>
    `;
}

function renderPriority() {
    document.getElementById("panel-content").innerHTML = `
        <h2 class="stat-title">Priority</h2>

        <div class="priority-item open">
            <button class="priority-header">
                <span>Road Priority</span>
                <span>${priorityRoads.length} ▼</span>
            </button>

            <div class="priority-list">
                ${priorityRoads
                    .map((road) => `
                        <button
                            class="priority-road"
                            data-road-id="${road.road_id}"
                        >
                            ${road.name} · ${road.damage_percentage}%
                        </button>
                    `)
                    .join("")}
            </div>
        </div>
    `;

    initPriorityDropdown();
    bindPriorityRoadButtons();
}

function renderFilter() {
    document.getElementById("panel-content").innerHTML = `
        <h2 class="stat-title">Filter</h2>

        <div class="filter-group">
            <label for="filter-search">Cari lokasi</label>
            <input
                id="filter-search"
                class="filter-input"
                type="text"
                placeholder="Nama jalan atau lokasi..."
                value="${activeFilter.query}"
            />
        </div>

        <div class="filter-group">
            <label for="filter-status">Status</label>
            <select id="filter-status" class="filter-select">
                <option value="">Semua</option>
                <option value="Menunggu Penanganan" ${activeFilter.status === "Menunggu Penanganan" ? "selected" : ""}>Menunggu Penanganan</option>
                <option value="Sedang Ditangani" ${activeFilter.status === "Sedang Ditangani" ? "selected" : ""}>Sedang Ditangani</option>
                <option value="Selesai Ditangani" ${activeFilter.status === "Selesai Ditangani" ? "selected" : ""}>Selesai Ditangani</option>
            </select>
        </div>

        <div class="filter-actions">
            <button id="apply-filter" class="action-btn" type="button">Terapkan</button>
            <button id="reset-filter" class="action-btn" type="button">Reset</button>
        </div>

        <div id="filter-results" class="filter-results"></div>
    `;

    initFilterEvents();
    applyFilters();
}

// Fungsi untuk membuat tombol terlihat aktif ketika diklik
function actionButton(id) {
    document
        .querySelectorAll(".action-btn")
        .forEach((btn) => btn.classList.remove("active"));

    const target = document.getElementById(id);
    if (target) {
        target.classList.add("active");
    }
}

function togglePanelView(buttonId, viewName, renderFn) {
    const btn = document.getElementById(buttonId);
    const panel = document.getElementById("panel-content");

    if (btn.classList.contains("active") && panel.dataset.view === viewName) {
        panel.dataset.view = "welcome";
        btn.classList.remove("active");
        renderWelcomePanel();
        return;
    }

    panel.dataset.view = viewName;
    actionButton(buttonId);
    renderFn();
}

document.getElementById("btn-statistic").addEventListener("click", () => {
    togglePanelView("btn-statistic", "priority", renderPriority);
});

document.getElementById("btn-filter").addEventListener("click", () => {
    togglePanelView("btn-filter", "filter", renderFilter);
});
