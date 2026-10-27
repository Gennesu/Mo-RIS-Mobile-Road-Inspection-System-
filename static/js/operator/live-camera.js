const cameraVideo = document.getElementById("live-camera");
const cameraStatus = document.getElementById("camera-status");
let cameraStream = null;
let cameraStartPromise = null;

function setCameraStatus(message) {
    if (cameraStatus) cameraStatus.textContent = message;
}

async function startCamera() {
    if (!cameraVideo) return false;

    if (cameraStream) return true;
    if (cameraStartPromise) return cameraStartPromise;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStatus(
            window.isSecureContext
                ? "Browser tidak mendukung akses kamera."
                : "Kamera perlu localhost atau HTTPS untuk bisa diakses."
        );
        return false;
    }

    const startPromise = (async function () {
        setCameraStatus("Mengakses kamera...");
        let stream = null;

        try {
            for (let attempt = 0; attempt < 2; attempt += 1) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: {ideal: "environment"},
                            width: {ideal: 1280},
                            height: {ideal: 720}
                        },
                        audio: false
                    });
                    break;
                } catch (error) {
                    if (error.name !== "NotReadableError" || attempt === 1) throw error;
                    await new Promise(function (resolve) {
                        setTimeout(resolve, 400);
                    });
                }
            }

            // A stop request may arrive while the browser permission prompt is open.
            if (cameraStartPromise !== startPromise) {
                stream.getTracks().forEach(function (track) {
                    track.stop();
                });
                return false;
            }

            cameraStream = stream;
            cameraVideo.srcObject = stream;
            await cameraVideo.play();
            setCameraStatus("");
            return true;
        } catch (error) {
            console.error("Gagal membuka kamera.", error);
            if (stream) {
                stream.getTracks().forEach(function (track) {
                    track.stop();
                });
                if (cameraStream === stream) cameraStream = null;
                if (cameraVideo.srcObject === stream) cameraVideo.srcObject = null;
            }

            const messages = {
                NotAllowedError: "Izin kamera ditolak. Izinkan akses kamera di browser.",
                NotFoundError: "Kamera tidak ditemukan.",
                NotReadableError: "Kamera sedang dipakai aplikasi lain.",
                OverconstrainedError: "Kamera tidak mendukung resolusi yang diminta.",
                SecurityError: "Kamera perlu localhost atau HTTPS untuk bisa diakses."
            };
            setCameraStatus(messages[error.name] || `Kamera gagal dibuka (${error.name}).`);
            return false;
        }
    })();

    cameraStartPromise = startPromise;
    try {
        return await startPromise;
    } finally {
        if (cameraStartPromise === startPromise) cameraStartPromise = null;
    }
}

async function stopCamera() {
    const pendingStart = cameraStartPromise;
    cameraStartPromise = null;

    if (pendingStart) await pendingStart;

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

