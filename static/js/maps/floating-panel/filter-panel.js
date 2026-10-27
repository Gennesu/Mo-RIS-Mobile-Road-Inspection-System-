let activeFilter = {
    query: "",
    status: ""
};

function initFilterEvents() {
    document.getElementById("filter-search").addEventListener("input", (event) => {
        activeFilter.query = event.target.value;
    });

    document.getElementById("filter-status").addEventListener("change", (event) => {
        activeFilter.status = event.target.value;
    });

    document.getElementById("apply-filter").addEventListener("click", () => {
        applyFilters();
    });

    document.getElementById("reset-filter").addEventListener("click", () => {
        activeFilter = { query: "", status: "" };
        renderFilter();
    });
}

function applyFilters() {
    const query = activeFilter.query.trim().toLowerCase();
    const status = activeFilter.status;

    const filtered = potholes.filter(p => {
        const matchQuery =
            !query || p.location_name.toLowerCase().includes(query);

        const matchStatus =
            !status || p.status === status;

        return matchQuery && matchStatus;
    });

    updateFilterResults(filtered);

    if (window.markerById && window.map) {
        window.markerById.forEach((marker, id) => {
            const matched = filtered.some(p => p.id === Number(id));
            if (matched) {
                if (!window.map.hasLayer(marker)) {
                    marker.addTo(window.map);
                }
            } else if (window.map.hasLayer(marker)) {
                window.map.removeLayer(marker);
            }
        });
    }
}

function updateFilterResults(items) {
    const results = document.getElementById("filter-results");
    if (!results) return;

    if (!items.length) {
        results.innerHTML = `
            <div class="filter-empty">
                Tidak ada hasil untuk filter ini.
            </div>
        `;
        return;
    }

    const formatAreaDisplay = (value) => {
        const numericValue = Number(value ?? 0);
        const formatNumber = (number, maxFractionDigits) => Number(number).toLocaleString("en-US", {
            maximumFractionDigits: maxFractionDigits,
        });

        if (numericValue < 1) {
            return `${formatNumber(numericValue * 10000, 3)} cm²`;
        }
        return `${formatNumber(numericValue, 3)} m²`;
    };

    results.innerHTML = items
        .map(p => `
            <button class="filter-item priority-road" data-id="${p.id}">
                <strong>${p.location_name}</strong>
                <div class="filter-item-meta">
                    ${p.status} · ${formatAreaDisplay(p.area_m2)}
                </div>
            </button>
        `)
        .join("");

    bindPriorityRoadButtons();
    document.querySelectorAll(".filter-item.priority-road").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-item.priority-road").forEach((item) => item.classList.remove("active"));
            btn.classList.add("active");
        });
    });
}








