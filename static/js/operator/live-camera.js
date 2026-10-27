const cameraVideo = document.getElementById("live-camera");
const cameraStatus = document.getElementById("camera-status");
let cameraStream = null;

function setCameraStatus(message) {
    if (cameraStatus) cameraStatus.textContent = message;
}

async function startCamera() {
    if (!cameraVideo) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStatus("Browser tidak mendukung akses kamera.");
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: {ideal: "environment"},
                width: {ideal: 1280},
                height: {ideal: 720}
            },
            audio: false
        });

        cameraStream = stream;
        cameraVideo.srcObject = stream;
        setCameraStatus("");
    } catch (error) {
        console.error("Gagal membuka kamera.", error);
        setCameraStatus("Kamera belum bisa diakses.");
    }
}

function stopCamera() {
    if (!cameraStream) return;

    cameraStream.getTracks().forEach(function (track) {
        track.stop();
    });
    cameraStream = null;

    if (cameraVideo) cameraVideo.srcObject = null;
}

window.operatorCamera = {
    start: startCamera,
    stop: stopCamera,
    setStatus: setCameraStatus
};

document.addEventListener("DOMContentLoaded", startCamera);
