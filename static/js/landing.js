const toggle = document.getElementById("navbar-toggle");
const menu = document.getElementById("navbar-menu");

toggle.addEventListener("click", () => {
    menu.classList.toggle("active");
});

const dashboardStats = document.querySelectorAll("[data-dashboard-stat]");
if (dashboardStats.length > 0) {
    const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

    async function refreshDashboardStats() {
        if (document.visibilityState !== "visible") return;

        try {
            const response = await fetch("/dashboard/stats", { cache: "no-store" });
            if (!response.ok) return;
            const stats = await response.json();

            dashboardStats.forEach((element) => {
                const value = Number(stats[element.dataset.dashboardStat]);
                if (Number.isFinite(value)) element.textContent = numberFormatter.format(value);
            });
        } catch (error) {
            // Keep the last rendered dashboard values while the server is unavailable.
        }
    }

    refreshDashboardStats();
    window.setInterval(refreshDashboardStats, 5000);
}
