const reviewCards = document.querySelectorAll("[data-review-id]");
const reviewCount = document.getElementById("review-count");
const pendingTabCount = document.querySelector('[data-review-tab="pending"] span');
const actionNotice = document.getElementById("review-action-notice");
const deleteDialog = document.getElementById("delete-confirm-dialog");
const deleteDialogTitle = document.getElementById("delete-confirm-title");
const confirmDeleteButton = document.querySelector("[data-confirm-delete]");
const confirmedStatusByTab = {
    confirmed: "Menunggu Penanganan",
    processing: "Sedang Ditangani",
    completed: "Selesai Ditangani",
};
const confirmedEmptyCopy = {
    confirmed: ["Belum ada lubang terkonfirmasi", "Lubang terkonfirmasi yang menunggu penanganan akan muncul di sini."],
    processing: ["Belum ada lubang yang ditangani", "Lubang yang sedang ditangani akan muncul di sini."],
    completed: ["Belum ada lubang yang selesai ditangani", "Lubang yang sudah selesai ditangani akan muncul di sini."],
};
const confirmedGrid = document.querySelector('[data-review-panel="confirmed"] .review-grid');
const confirmedEmpty = document.querySelector("[data-confirmed-empty]");
const confirmedEmptyTitle = document.querySelector("[data-confirmed-empty-title]");
const confirmedEmptyMessage = document.querySelector("[data-confirmed-empty-message]");
let pendingDelete = null;
let activeReviewTab = "pending";

function refreshConfirmedCounts() {
    const countIdsByStatus = {
        "Menunggu Penanganan": "confirmed-count",
        "Sedang Ditangani": "processing-count",
        "Selesai Ditangani": "completed-count",
    };

    Object.entries(countIdsByStatus).forEach(([status, countId]) => {
        const count = Array.from(document.querySelectorAll("[data-confirmed-id]"))
            .filter((card) => card.dataset.handlingStatus === status).length;
        const countElement = document.getElementById(countId);
        if (countElement) countElement.textContent = String(count);
    });
}

function filterConfirmedCards(tabName) {
    const status = confirmedStatusByTab[tabName];
    if (!status) return;

    let visibleCount = 0;
    document.querySelectorAll("[data-confirmed-id]").forEach((card) => {
        const visible = card.dataset.handlingStatus === status;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
    });

    if (confirmedGrid) confirmedGrid.hidden = visibleCount === 0;
    if (confirmedEmpty) confirmedEmpty.hidden = visibleCount > 0;
    if (confirmedEmptyTitle && confirmedEmptyCopy[tabName]) {
        confirmedEmptyTitle.textContent = confirmedEmptyCopy[tabName][0];
    }
    if (confirmedEmptyMessage && confirmedEmptyCopy[tabName]) {
        confirmedEmptyMessage.textContent = confirmedEmptyCopy[tabName][1];
    }
}

function activateReviewTab(name, updateLocation = true) {
    activeReviewTab = name;
    document.querySelectorAll("[data-review-tab]").forEach((tab) => {
        const active = tab.dataset.reviewTab === name;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
    });
    const activeTab = document.querySelector(`[data-review-tab="${name}"]`);
    document.querySelectorAll("[data-review-panel]").forEach((panel) => {
        const active = panel.dataset.reviewPanel === (name === "pending" ? "pending" : "confirmed");
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
        if (active && panel.dataset.reviewPanel === "confirmed" && activeTab) {
            panel.setAttribute("aria-labelledby", activeTab.id);
        }
    });
    filterConfirmedCards(name);
    if (updateLocation) {
        window.history.replaceState(null, "", name === "pending" ? window.location.pathname : `#${name}`);
    }
}

document.querySelectorAll("[data-review-tab]").forEach((tab) => {
    tab.addEventListener("click", () => activateReviewTab(tab.dataset.reviewTab));
});
const requestedTab = window.location.hash.slice(1);
activateReviewTab(confirmedStatusByTab[requestedTab] ? requestedTab : "pending", false);

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

document.querySelectorAll("[data-update-handling-status]").forEach((button) => {
    button.addEventListener("click", async () => {
        const card = button.closest("[data-confirmed-id]");
        if (!card) return;

        const feedback = card.querySelector(".handling-feedback");
        const detectionId = card.dataset.confirmedId;
        const targetStatus = button.dataset.targetStatus;
        const nextTab = button.dataset.nextTab;
        const originalLabel = button.textContent.trim();
        button.disabled = true;
        button.textContent = "Menyimpan status...";
        if (feedback) feedback.textContent = "";

        try {
            const response = await fetch(`/operator/confirmed/${detectionId}/handling-status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: targetStatus }),
            });
            const result = await response.json();
            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Status penanganan gagal diperbarui.");
            }

            card.dataset.handlingStatus = result.status;
            const statusLabel = Array.from(card.querySelectorAll(".review-details dt"))
                .find((term) => term.textContent.trim() === "Status penanganan")?.nextElementSibling;
            if (statusLabel) statusLabel.textContent = result.status;

            if (result.status === "Sedang Ditangani") {
                button.disabled = false;
                button.classList.add("is-complete");
                button.textContent = "Tandai selesai ditangani";
                button.dataset.targetStatus = "Selesai Ditangani";
                button.dataset.nextTab = "completed";
            } else {
                const completeLabel = document.createElement("span");
                completeLabel.className = "handling-complete-label";
                completeLabel.textContent = "Penanganan selesai";
                button.replaceWith(completeLabel);
            }

            refreshConfirmedCounts();
            activateReviewTab(nextTab);
            if (actionNotice) {
                actionNotice.textContent = `Status lubang #${detectionId} diperbarui menjadi ${result.status}.`;
            }
        } catch (error) {
            if (feedback) feedback.textContent = error.message || "Terjadi kesalahan.";
            button.disabled = false;
            button.textContent = originalLabel;
        }
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
    if (actionNotice) actionNotice.textContent = "";

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
        refreshConfirmedCounts();
        if (actionNotice) {
            actionNotice.textContent = result.image_removed
                ? `Lubang #${detectionId} dan foto terkait berhasil dihapus.`
                : `Data lubang #${detectionId} dihapus; foto terkait tidak ditemukan.`;
        }

        filterConfirmedCards(activeReviewTab);
        const nextDeleteButton = Array.from(document.querySelectorAll("[data-confirmed-id]"))
            .find((item) => !item.hidden)?.querySelector("[data-delete-confirmed]");
        (nextDeleteButton || document.querySelector(`[data-review-tab="${activeReviewTab}"]`))?.focus();
    } catch (error) {
        if (feedback) feedback.textContent = error.message || "Terjadi kesalahan.";
        button.disabled = false;
    }
});
