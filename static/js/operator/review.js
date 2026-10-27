const reviewCards = document.querySelectorAll("[data-review-id]");
const reviewCount = document.getElementById("review-count");
const pendingTabCount = document.querySelector('[data-review-tab="pending"] span');
const actionNotice = document.getElementById("review-action-notice");
const deleteDialog = document.getElementById("delete-confirm-dialog");
const deleteDialogTitle = document.getElementById("delete-confirm-title");
const deleteDialogMessage = document.getElementById("delete-confirm-message");
const confirmDeleteButton = document.querySelector("[data-confirm-delete]");
const selectionToolbar = document.getElementById("selection-toolbar");
const selectedDetectionCount = document.getElementById("selected-detection-count");
const selectVisibleDetections = document.getElementById("select-visible-detections");
const bulkActionFeedback = document.getElementById("bulk-action-feedback");
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

const bulkActionsByTab = {
    pending: ["confirm", "reject"],
    confirmed: ["start-handling", "delete"],
    processing: ["complete-handling", "delete"],
    completed: ["delete"],
};

try {
    const notice = window.sessionStorage.getItem("review-action-notice");
    if (notice && actionNotice) actionNotice.textContent = notice;
    if (notice) window.sessionStorage.removeItem("review-action-notice");
} catch (error) {
    // Keep the review page usable when session storage is unavailable.
}

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

function getVisibleReviewCards() {
    const selector = activeReviewTab === "pending" ? "[data-review-id]" : "[data-confirmed-id]";
    return Array.from(document.querySelectorAll(selector)).filter((card) => !card.hidden);
}

function getSelectedReviewCards() {
    return getVisibleReviewCards().filter((card) => card.querySelector("[data-select-detection]")?.checked);
}

function updateSelectionControls() {
    const cards = getVisibleReviewCards();
    const selectedCards = getSelectedReviewCards();
    const selectedCount = selectedCards.length;
    const allowedActions = bulkActionsByTab[activeReviewTab] || [];

    if (selectionToolbar) selectionToolbar.hidden = selectedCount === 0;
    if (selectedDetectionCount) selectedDetectionCount.textContent = String(selectedCount);
    if (selectVisibleDetections) {
        selectVisibleDetections.disabled = cards.length === 0;
        selectVisibleDetections.checked = cards.length > 0 && selectedCount === cards.length;
        selectVisibleDetections.indeterminate = selectedCount > 0 && selectedCount < cards.length;
    }
    document.querySelectorAll("[data-bulk-action]").forEach((button) => {
        button.hidden = !allowedActions.includes(button.dataset.bulkAction);
        button.disabled = false;
    });
}

function clearReviewSelection() {
    document.querySelectorAll("[data-select-detection]").forEach((checkbox) => {
        checkbox.checked = false;
        checkbox.closest("[data-review-id], [data-confirmed-id]")?.classList.remove("is-selected");
    });
    if (bulkActionFeedback) bulkActionFeedback.textContent = "";
    updateSelectionControls();
}

function setReviewActionNotice(message) {
    try {
        window.sessionStorage.setItem("review-action-notice", message);
    } catch (error) {
        // The action can complete even if the notice cannot be stored.
    }
}

function openDeleteConfirmation(cards, trigger) {
    if (!deleteDialog || cards.length === 0) return;
    pendingDelete = { cards, trigger };
    if (cards.length === 1) {
        const detectionId = cards[0].dataset.confirmedId;
        if (deleteDialogTitle) deleteDialogTitle.textContent = `Hapus lubang #${detectionId}?`;
        if (deleteDialogMessage) deleteDialogMessage.textContent = "Data database dan foto terkait akan dihapus. Tindakan ini tidak dapat dibatalkan.";
    } else {
        if (deleteDialogTitle) deleteDialogTitle.textContent = `Hapus ${cards.length} lubang terpilih?`;
        if (deleteDialogMessage) deleteDialogMessage.textContent = `Data database dan foto terkait untuk ${cards.length} lubang terpilih akan dihapus. Tindakan ini tidak dapat dibatalkan.`;
    }
    deleteDialog.returnValue = "";
    deleteDialog.showModal();
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
    updateSelectionControls();
    if (updateLocation) {
        window.history.replaceState(null, "", name === "pending" ? window.location.pathname : `#${name}`);
    }
}

document.querySelectorAll("[data-review-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
        clearReviewSelection();
        activateReviewTab(tab.dataset.reviewTab);
    });
});
const requestedTab = window.location.hash.slice(1);
activateReviewTab(confirmedStatusByTab[requestedTab] ? requestedTab : "pending", false);
updateSelectionControls();

document.querySelectorAll("[data-select-detection]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
        checkbox.closest("[data-review-id], [data-confirmed-id]")?.classList.toggle("is-selected", checkbox.checked);
        updateSelectionControls();
    });
});

selectVisibleDetections?.addEventListener("change", () => {
    getVisibleReviewCards().forEach((card) => {
        const checkbox = card.querySelector("[data-select-detection]");
        if (checkbox) checkbox.checked = selectVisibleDetections.checked;
        card.classList.toggle("is-selected", selectVisibleDetections.checked);
    });
    updateSelectionControls();
});

document.querySelector("[data-clear-selection]")?.addEventListener("click", clearReviewSelection);

async function runBulkAction(action, cards, trigger) {
    if (!cards.length) return;

    const progress = action === "delete" && cards.length === 1
        ? cards[0].querySelector(".delete-feedback")
        : bulkActionFeedback;
    const toolbarButtons = selectionToolbar?.querySelectorAll("button") || [];
    toolbarButtons.forEach((button) => { button.disabled = true; });
    document.querySelectorAll("[data-select-detection]").forEach((checkbox) => { checkbox.disabled = true; });
    if (selectVisibleDetections) selectVisibleDetections.disabled = true;
    cards.forEach((card) => card.querySelectorAll("button").forEach((button) => { button.disabled = true; }));
    if (trigger) trigger.disabled = true;

    let succeeded = 0;
    const errors = [];
    for (let index = 0; index < cards.length; index += 1) {
        const card = cards[index];
        const detectionId = card.dataset.reviewId || card.dataset.confirmedId;
        if (progress) progress.textContent = `Memproses ${index + 1} dari ${cards.length}...`;

        let url;
        let payload = {};
        if (action === "confirm" || action === "reject") {
            url = `/operator/review/${detectionId}`;
            payload = {
                decision: action,
                note: card.querySelector(".review-note")?.value.trim() || "",
            };
        } else if (action === "start-handling" || action === "complete-handling") {
            url = `/operator/confirmed/${detectionId}/handling-status`;
            payload.status = action === "start-handling" ? "Sedang Ditangani" : "Selesai Ditangani";
        } else if (action === "delete") {
            url = `/operator/confirmed/${detectionId}/delete`;
        } else {
            errors.push(`#${detectionId}: aksi tidak dikenal`);
            continue;
        }

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok || !result.ok) {
                throw new Error(result.error || "Aksi gagal diproses.");
            }
            succeeded += 1;
        } catch (error) {
            errors.push(`#${detectionId}: ${error.message || "gagal diproses"}`);
        }
    }

    if (succeeded > 0) {
        const actionMessages = {
            confirm: "dikonfirmasi",
            reject: "ditandai bukan lubang",
            "start-handling": "ditandai sedang ditangani",
            "complete-handling": "ditandai selesai ditangani",
            delete: "dihapus",
        };
        let message = `${succeeded} dari ${cards.length} pilihan berhasil ${actionMessages[action]}.`;
        if (errors.length > 0) message += ` ${errors.length} gagal: ${errors.join("; ")}`;
        setReviewActionNotice(message);
        window.location.reload();
        return;
    }

    if (progress) progress.textContent = errors.join("; ") || "Tidak ada data yang berhasil diproses.";
    toolbarButtons.forEach((button) => { button.disabled = false; });
    document.querySelectorAll("[data-select-detection]").forEach((checkbox) => { checkbox.disabled = false; });
    cards.forEach((card) => card.querySelectorAll("button").forEach((button) => { button.disabled = false; }));
    if (trigger) trigger.disabled = false;
    updateSelectionControls();
}

document.querySelectorAll("[data-bulk-action]").forEach((button) => {
    button.addEventListener("click", () => {
        const selectedCards = getSelectedReviewCards();
        const action = button.dataset.bulkAction;
        if (selectedCards.length === 0) return;

        if (action === "delete") {
            openDeleteConfirmation(selectedCards, button);
            return;
        }
        runBulkAction(action, selectedCards, button);
    });
});

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
                    try {
                        window.sessionStorage.setItem(
                            "review-action-notice",
                            `Deteksi #${card.dataset.reviewId} berhasil dikonfirmasi.`
                        );
                    } catch (error) {
                        // The confirmation is complete even if the notice cannot be stored.
                    }
                    window.location.reload();
                    return;
                }

                card.remove();
                updateSelectionControls();
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
        openDeleteConfirmation([card], button);
    });
});

document.querySelectorAll("[data-update-handling-status]").forEach((button) => {
    button.addEventListener("click", async () => {
        const card = button.closest("[data-confirmed-id]");
        if (!card) return;

        const feedback = card.querySelector(".handling-feedback");
        const detectionId = card.dataset.confirmedId;
        const targetStatus = button.dataset.targetStatus;
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
            } else {
                const completeLabel = document.createElement("span");
                completeLabel.className = "handling-complete-label";
                completeLabel.textContent = "Penanganan selesai";
                button.replaceWith(completeLabel);
            }

            refreshConfirmedCounts();
            filterConfirmedCards(activeReviewTab);
            card.querySelector("[data-select-detection]").checked = false;
            card.classList.remove("is-selected");
            updateSelectionControls();
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
    const deletion = pendingDelete;
    pendingDelete = null;
    deleteDialog?.close("confirm");
    await runBulkAction("delete", deletion.cards, deletion.trigger);
});
