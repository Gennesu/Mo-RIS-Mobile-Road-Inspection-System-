const startDetectionButton = document.getElementById("btn-start-detection");
const stopDetectionButton = document.getElementById("btn-stop-detection");
const liveCamera = document.getElementById("live-camera");
const detectionCamera = document.getElementById("detection-camera");
const cameraTransition = document.getElementById("camera-transition");
const previewUrl = "/static/runtime/detection-preview";
let previewTimer = null;
let previewIndex = 0;

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

async function refreshDetectionStatus() {
    if (!startDetectionButton || !stopDetectionButton) return;

    try {
        const response = await fetch("/operator/detection-status");
        const status = await response.json();

        if (status.detector_running) {
            if (window.operatorCamera) {
                await window.operatorCamera.stop();
                window.operatorCamera.setStatus("");
            }
            showDetectionPreview();
            setDetectionControls("running");
        } else if (window.operatorCamera) {
            await window.operatorCamera.start();
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
            return;
        }

        hideDetectionPreview();
        hideTransition();
        if (window.operatorCamera) await window.operatorCamera.start();
        setDetectionControls("idle");
    } catch (error) {
        console.error(error);
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

    try {
        await fetch("/operator/stop-detection", {
            method: "POST"
        });
    } catch (error) {
        console.error("Gagal menghentikan deteksi.", error);
    }

    hideDetectionPreview();
    if (window.operatorCamera) await window.operatorCamera.start();
    hideTransition();
    setDetectionControls("idle");
}

if (startDetectionButton && stopDetectionButton) {
    startDetectionButton.addEventListener("click", startDetection);
    stopDetectionButton.addEventListener("click", stopDetection);
    refreshDetectionStatus();
}
