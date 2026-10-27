const reviewCards = document.querySelectorAll("[data-review-id]");
const reviewCount = document.getElementById("review-count");
const pendingTabCount = document.querySelector('[data-review-tab="pending"] span');
const confirmedCount = document.getElementById("confirmed-count");
const deleteNotice = document.getElementById("review-delete-notice");
const deleteDialog = document.getElementById("delete-confirm-dialog");
const deleteDialogTitle = document.getElementById("delete-confirm-title");
const confirmDeleteButton = document.querySelector("[data-confirm-delete]");
let pendingDelete = null;

function activateReviewTab(name, updateLocation = true) {
    document.querySelectorAll("[data-review-tab]").forEach((tab) => {
        const active = tab.dataset.reviewTab === name;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-review-panel]").forEach((panel) => {
        const active = panel.dataset.reviewPanel === name;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
    });
    if (updateLocation) {
        window.history.replaceState(null, "", name === "confirmed" ? "#confirmed" : window.location.pathname);
    }
}

document.querySelectorAll("[data-review-tab]").forEach((tab) => {
    tab.addEventListener("click", () => activateReviewTab(tab.dataset.reviewTab));
});
activateReviewTab(window.location.hash === "#confirmed" ? "confirmed" : "pending", false);

reviewCards.forEach((card) => {
    card.querySelectorAll("[data-decision]").forEach((button) => {
        button.addEventListener("click", async () => {
            const feedback = card.querySelector(".review-feedback");
            const buttons = card.querySelectorAll("button");
            const decision = button.dataset.decision;
            const note = card.querySelector(".review-note")?.value.trim() || "";
            buttons.forEach((item) => { item.disabled = true; });
            feedback.textContent = "Menyimpan keputusan…";

            try {
                const response = await fetch(`/operator/review/${card.dataset.reviewId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ decision, note }),
                });
                const result = await response.json();
                if (!response.ok || !result.ok) {
                    throw new Error(result.error || "Keputusan gagal disimpan.");
                }

                if (decision === "confirm") {
                    window.location.assign("/operator/review#confirmed");
                    return;
                }

                card.remove();
                const remaining = document.querySelectorAll("[data-review-id]").length;
                if (reviewCount) reviewCount.textContent = String(remaining);
                if (pendingTabCount) pendingTabCount.textContent = String(remaining);
                if (remaining === 0) {
                    const grid = document.querySelector(".review-grid");
                    if (grid) {
                        grid.outerHTML = '<section class="review-empty"><span aria-hidden="true">✓</span><h2>Antrean verifikasi kosong</h2><p>Deteksi baru akan muncul di sini setelah kamera mengirimkannya.</p></section>';
                    }
                }
            } catch (error) {
                feedback.textContent = error.message || "Terjadi kesalahan.";
                buttons.forEach((item) => { item.disabled = false; });
            }
        });
    });
});

document.querySelectorAll("[data-delete-confirmed]").forEach((button) => {
    button.addEventListener("click", () => {
        const card = button.closest("[data-confirmed-id]");
        if (!card || !deleteDialog) return;

        const detectionId = card.dataset.confirmedId;
        pendingDelete = { card, button };
        if (deleteDialogTitle) deleteDialogTitle.textContent = `Hapus lubang #${detectionId}?`;
        deleteDialog.returnValue = "";
        deleteDialog.showModal();
    });
});

document.querySelector("[data-cancel-delete]")?.addEventListener("click", () => {
    if (deleteDialog?.open) deleteDialog.close("cancel");
});

deleteDialog?.addEventListener("close", () => {
    if (deleteDialog.returnValue !== "confirm") pendingDelete = null;
});

confirmDeleteButton?.addEventListener("click", async () => {
    if (!pendingDelete) return;
    const { card, button } = pendingDelete;
    pendingDelete = null;
    deleteDialog?.close("confirm");

    const detectionId = card.dataset.confirmedId;
    const feedback = card.querySelector(".delete-feedback");
    button.disabled = true;
    if (feedback) feedback.textContent = "Menghapus data lubang...";
    if (deleteNotice) deleteNotice.textContent = "";

    try {
        const response = await fetch(`/operator/confirmed/${detectionId}/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
            throw new Error(result.error || "Lubang gagal dihapus.");
        }

        card.remove();
        const remaining = document.querySelectorAll("[data-confirmed-id]").length;
        if (confirmedCount) confirmedCount.textContent = String(remaining);
        if (deleteNotice) {
            deleteNotice.textContent = result.image_removed
                ? `Lubang #${detectionId} dan foto terkait berhasil dihapus.`
                : `Data lubang #${detectionId} dihapus; foto terkait tidak ditemukan.`;
        }

        if (remaining === 0) {
            const grid = document.querySelector('[data-review-panel="confirmed"] .review-grid');
            if (grid) {
                grid.outerHTML = '<div class="review-empty"><h2>Belum ada lubang terkonfirmasi</h2><p>Lubang yang dikonfirmasi operator akan muncul di sini.</p></div>';
            }
        }
        document.querySelector("[data-delete-confirmed]")?.focus();
    } catch (error) {
        if (feedback) feedback.textContent = error.message || "Terjadi kesalahan.";
        button.disabled = false;
    }
});
