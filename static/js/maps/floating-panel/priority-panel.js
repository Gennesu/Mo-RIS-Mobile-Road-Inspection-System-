function renderSeverity(level, label) {
    const data = potholes.filter(p => p.severity === level);

    return `
        <div class="priority-item">
            <button class="priority-header">
                <span>
                    <span class="box severity-${level}"></span>
                    ${label}
                </span>
                <span>
                    ${data.length} ▼
                </span>
            </button>

            <div class="priority-list">
                ${data.map(p => `
                    <button
                        class="priority-road"
                        data-id="${p.id}"
                    >
                        ${p.location_name}
                    </button>
                `).join("")}

            </div>

        </div>
    `;
}

function initPriorityDropdown() {
    document
        .querySelectorAll(".priority-header")
        .forEach(btn => {
            btn.addEventListener("click", () => {
                btn.parentElement.classList.toggle("open");

            });

        });

}