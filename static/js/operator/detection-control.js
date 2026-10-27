const startDetectionButton = document.getElementById("btn-start-detection");
const stopDetectionButton = document.getElementById("btn-stop-detection");
const liveCamera = document.getElementById("live-camera");
const detectionCamera = document.getElementById("detection-camera");
const cameraTransition = document.getElementById("camera-transition");
const currentBody = document.querySelector(".current-body");
const recentList = document.querySelector(".recent-list");
const previewUrl = "/static/runtime/detection-preview";
let previewTimer = null;
let previewIndex = 0;
let detectionFeedAfterId = 0;
let detectionFeedTimer = null;
let detectionFeedBusy = false;
const recentDetectionRows = new Map();

function setDetectionControls(state) {
    if (!startDetectionButton || !stopDetectionButton) return;

    startDetectionButton.dataset.state = state;
    stopDetectionButton.dataset.state = state;

    if (state === "running") {
        startDetectionButton.textContent = "Deteksi Berjalan";
        startDetectionButton.disabled = true;
        stopDetectionButton.disabled = false;
        return;
    }

    if (state === "loading") {
        startDetectionButton.textContent = "Menjalankan...";
        startDetectionButton.disabled = true;
        stopDetectionButton.disabled = true;
        return;
    }

    if (state === "stopping") {
        stopDetectionButton.textContent = "Menghentikan...";
        startDetectionButton.disabled = true;
        stopDetectionButton.disabled = true;
        return;
    }

    if (state === "error") {
        startDetectionButton.textContent = "Gagal Mulai";
        startDetectionButton.disabled = false;
        stopDetectionButton.disabled = true;
        stopDetectionButton.textContent = "Stop Deteksi";
        return;
    }

    startDetectionButton.textContent = "Mulai Deteksi";
    startDetectionButton.disabled = false;
    stopDetectionButton.textContent = "Stop Deteksi";
    stopDetectionButton.disabled = true;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[character]);
}

async function loadDetectionFeed(afterId = 0, limit = 6) {
    const response = await fetch(
        `/operator/detection-feed?after_id=${encodeURIComponent(afterId)}&limit=${limit}`,
        { cache: "no-store" }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Feed deteksi gagal dimuat.");
    return result;
}

function renderEmptyDetection(message, description, isMonitoring = false) {
    if (!currentBody) return;
    const monitoringClass = isMonitoring ? " is-monitoring" : "";
    currentBody.innerHTML = `
        <div class="empty-state${monitoringClass}">
            <strong>${escapeHtml(message)}</strong>
            <span>${escapeHtml(description)}</span>
        </div>`;
}

function renderEmptyRecent(message, description) {
    if (!recentList) return;
    recentList.classList.add("is-empty");
    recentList.innerHTML = `
        <div class="empty-state compact">
            <strong>${escapeHtml(message)}</strong>
            <span>${escapeHtml(description)}</span>
        </div>`;
}

function getVerificationText(detection) {
    const status = detection.verification_status;
    if (status === "confirmed") return "Terkonfirmasi";
    if (status === "rejected") return "Ditolak";
    return "Menunggu verifikasi";
}

function getVerifierText(detection) {
    const labels = {
        pothole: "AI kedua: kandidat lubang",
        crack: "AI kedua: kandidat retak",
        unknown: "AI kedua: belum pasti",
        unavailable: "AI kedua: tidak tersedia",
    };
    const label = labels[detection.verifier_label] || "AI kedua: menunggu hasil";
    const confidence = Number(detection.verifier_confidence);
    return Number.isFinite(confidence) ? `${label} · ${confidence.toFixed(1)}%` : label;
}

function renderCurrentDetection(detection) {
    if (!currentBody) return;

    const id = Number(detection.id) || 0;
    const label = escapeHtml(String(detection.label || "Kerusakan").replace(/^./, (letter) => letter.toUpperCase()));
    const confidence = Number(detection.confidence);
    const confidenceText = Number.isFinite(confidence) ? `${confidence.toFixed(1)}%` : "-";
    const imagePath = String(detection.image_path || "").replace(/^\/+/, "");
    const imageMarkup = imagePath
        ? `<img src="/static/${escapeHtml(imagePath)}" alt="Bukti deteksi #${id}" loading="lazy">`
        : `<div class="current-image-placeholder">Foto deteksi tidak tersedia</div>`;
    const length = Number(detection.length_cm);
    const width = Number(detection.width_cm);
    const sizeText = Number.isFinite(length) && Number.isFinite(width)
        ? `${length.toFixed(1)} × ${width.toFixed(1)} cm`
        : "-";
    const hasLocation = detection.latitude !== null && detection.longitude !== null
        && detection.latitude !== undefined && detection.longitude !== undefined;
    const locationText = hasLocation
        ? `${Number(detection.latitude).toFixed(6)}, ${Number(detection.longitude).toFixed(6)}`
        : "Lokasi tidak tersedia";

    currentBody.innerHTML = `
        <figure class="current-image">
            ${imageMarkup}
            <figcaption class="current-caption">
                <strong>${label} #${id}</strong>
                <span>${confidenceText}</span>
            </figcaption>
        </figure>
        <div class="current-list">
            <div class="current-item"><span>Verifikasi</span><strong>${escapeHtml(getVerificationText(detection))}</strong></div>
            <div class="current-item"><span>Pemeriksaan AI</span><strong>${escapeHtml(getVerifierText(detection))}</strong></div>
            <div class="current-item"><span>Ukuran</span><strong>${escapeHtml(sizeText)}</strong></div>
            <div class="current-item"><span>Koordinat</span><strong>${escapeHtml(locationText)}</strong></div>
            <div class="current-item"><span>Waktu</span><strong>${escapeHtml(detection.detected_at || "-")}</strong></div>
        </div>`;
}

function renderRecentDetections() {
    if (!recentList) return;
    const detections = Array.from(recentDetectionRows.values())
        .sort((left, right) => Number(right.id) - Number(left.id))
        .slice(0, 6);

    if (!detections.length) {
        renderEmptyRecent("Belum ada riwayat deteksi", "Hasil deteksi sesi ini akan muncul di sini.");
        return;
    }

    recentList.classList.remove("is-empty");
    recentList.innerHTML = detections.map((detection) => {
        const id = Number(detection.id) || 0;
        const label = escapeHtml(String(detection.label || "Kerusakan").replace(/^./, (letter) => letter.toUpperCase()));
        const confidence = Number(detection.confidence);
        const confidenceText = Number.isFinite(confidence) ? `${confidence.toFixed(1)}%` : "-";
        return `<div class="recent-item"><span>#${id} · ${label}</span><small>${escapeHtml(detection.detected_at || "-")} · ${confidenceText}</small></div>`;
    }).join("");
}

function rememberDetections(detections) {
    detections.forEach((detection) => {
        if (detection && detection.id !== undefined) {
            recentDetectionRows.set(Number(detection.id), detection);
        }
    });

    const ids = Array.from(recentDetectionRows.keys()).sort((left, right) => right - left);
    ids.slice(6).forEach((id) => recentDetectionRows.delete(id));
    renderRecentDetections();

    const latest = Array.from(recentDetectionRows.values())
        .sort((left, right) => Number(right.id) - Number(left.id))[0];
    if (latest) renderCurrentDetection(latest);
}

async function primeDetectionFeed(showLatest) {
    recentDetectionRows.clear();
    try {
        const snapshot = await loadDetectionFeed(0, 6);
        const latestId = Number(snapshot.latest_id) || 0;
        detectionFeedAfterId = showLatest ? 0 : latestId;
        if (showLatest) rememberDetections(snapshot.detections || []);
    } catch (error) {
        detectionFeedAfterId = 0;
        console.warn("Feed deteksi belum tersedia.", error);
    }
}

async function pollDetectionFeed() {
    if (detectionFeedBusy) return;
    detectionFeedBusy = true;
    try {
        const result = await loadDetectionFeed(detectionFeedAfterId, 6);
        const detections = Array.isArray(result.detections) ? result.detections : [];
        if (detections.length) rememberDetections(detections);
        if (!recentDetectionRows.size) {
            renderEmptyDetection("Deteksi berjalan", "Kamera sedang memantau jalan; hasil akan muncul saat model menemukan kerusakan.", true);
        }
    } catch (error) {
        console.warn("Gagal memperbarui panel deteksi.", error);
    } finally {
        detectionFeedBusy = false;
    }
}

function startDetectionFeed() {
    clearInterval(detectionFeedTimer);
    pollDetectionFeed();
    detectionFeedTimer = setInterval(pollDetectionFeed, 1500);
}

function stopDetectionFeed(showFinishedState = false) {
    clearInterval(detectionFeedTimer);
    detectionFeedTimer = null;
    if (showFinishedState && !recentDetectionRows.size) {
        renderEmptyDetection("Sesi deteksi selesai", "Tidak ada objek yang tercatat pada sesi ini.");
        renderEmptyRecent("Belum ada riwayat deteksi", "Sesi ini tidak menghasilkan deteksi baru.");
    }
}

function resetDetectionFeed() {
    recentDetectionRows.clear();
    renderEmptyDetection("Belum ada deteksi aktif", "Detail akan muncul setelah sesi perekaman kerusakan dimulai.");
    renderEmptyRecent("Belum ada riwayat deteksi", "Riwayat sesi ini masih kosong.");
}

async function refreshDetectionStatus() {
    if (!startDetectionButton || !stopDetectionButton) return;

    try {
        const response = await fetch("/operator/detection-status");
        const status = await response.json();

        if (status.detector_running) {
            await primeDetectionFeed(true);
            if (!recentDetectionRows.size) {
                renderEmptyDetection("Deteksi berjalan", "Kamera sedang memantau jalan; hasil akan muncul saat model menemukan kerusakan.", true);
            }
            if (window.operatorCamera) {
                await window.operatorCamera.stop();
                window.operatorCamera.setStatus("");
            }
            showDetectionPreview();
            setDetectionControls("running");
            startDetectionFeed();
        } else if (window.operatorCamera) {
            await primeDetectionFeed(false);
            stopDetectionFeed();
            await window.operatorCamera.start();
        } else {
            await primeDetectionFeed(false);
            stopDetectionFeed();
        }
    } catch (error) {
        console.error("Gagal membaca status deteksi.", error);
    }
}

function showTransition(message) {
    if (!cameraTransition) return;

    cameraTransition.classList.add("is-visible");
    cameraTransition.querySelector("span").textContent = message;
}

function hideTransition() {
    if (cameraTransition) cameraTransition.classList.remove("is-visible");
}

function showDetectionPreview() {
    if (!detectionCamera || !liveCamera) return;

    liveCamera.classList.add("is-hidden");
    detectionCamera.classList.add("is-active");

    clearInterval(previewTimer);
    previewTimer = setInterval(function () {
        detectionCamera.src = `${previewUrl}-${previewIndex % 3}.jpg?t=${Date.now()}`;
        previewIndex += 1;
    }, 200);
}

function hideDetectionPreview() {
    clearInterval(previewTimer);
    previewTimer = null;

    if (detectionCamera) {
        detectionCamera.classList.remove("is-active");
        detectionCamera.removeAttribute("src");
    }

    if (liveCamera) liveCamera.classList.remove("is-hidden");
}

function syncLocationForDetection() {
    if (!window.operatorLocation) return;

    window.operatorLocation.syncNow();
    setTimeout(function () {
        window.operatorLocation.syncNow();
    }, 1200);
    setTimeout(function () {
        window.operatorLocation.syncNow();
    }, 2600);
}

if (detectionCamera) {
    detectionCamera.addEventListener("load", hideTransition);
}

async function startDetection() {
    if (!startDetectionButton || startDetectionButton.disabled) return;

    setDetectionControls("loading");
    showTransition("Menyiapkan kamera deteksi...");
    await primeDetectionFeed(false);
    recentDetectionRows.clear();
    renderEmptyDetection("Menyiapkan deteksi", "Kamera sedang disiapkan; hasil akan muncul setelah model menemukan kerusakan.", true);
    renderEmptyRecent("Memulai sesi deteksi", "Riwayat sesi ini masih kosong.");

    if (window.operatorCamera) {
        await window.operatorCamera.stop();
        window.operatorCamera.setStatus("");
    }

    showDetectionPreview();

    try {
        const response = await fetch("/operator/start-detection", {
            method: "POST"
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Gagal menjalankan deteksi.");
        }

        if (result.detector_running) {
            syncLocationForDetection();
            setDetectionControls("running");
            startDetectionFeed();
            return;
        }

        stopDetectionFeed();
        resetDetectionFeed();
        hideDetectionPreview();
        hideTransition();
        if (window.operatorCamera) await window.operatorCamera.start();
        setDetectionControls("idle");
    } catch (error) {
        console.error(error);
        stopDetectionFeed();
        resetDetectionFeed();
        hideDetectionPreview();
        hideTransition();
        if (window.operatorCamera) window.operatorCamera.start();
        setDetectionControls("error");
        setTimeout(function () {
            setDetectionControls("idle");
        }, 2500);
        return;
    }

    hideTransition();
}

async function stopDetection() {
    if (!stopDetectionButton || stopDetectionButton.disabled) return;

    setDetectionControls("stopping");
    showTransition("Mengembalikan kamera biasa...");

    let result;
    try {
        const response = await fetch("/operator/stop-detection", {
            method: "POST"
        });
        result = await response.json();
        if (!response.ok) throw new Error(result.message || "Gagal menghentikan deteksi.");
    } catch (error) {
        console.error("Gagal menghentikan deteksi.", error);
        hideTransition();
        setDetectionControls("running");
        if (window.operatorCamera) {
            window.operatorCamera.setStatus("Server belum memastikan kamera detector sudah dilepas.");
        }
        return;
    }

    if (result.detector_running) {
        hideTransition();
        setDetectionControls("running");
        if (window.operatorCamera) {
            window.operatorCamera.setStatus("Detector masih berjalan dan masih memakai kamera.");
        }
        return;
    }

    hideDetectionPreview();
    stopDetectionFeed(true);
    await new Promise(function (resolve) {
        setTimeout(resolve, 500);
    });
    if (window.operatorCamera) await window.operatorCamera.start();
    hideTransition();
    setDetectionControls("idle");
}

if (startDetectionButton && stopDetectionButton) {
    startDetectionButton.addEventListener("click", startDetection);
    stopDetectionButton.addEventListener("click", stopDetection);
    refreshDetectionStatus();
}
