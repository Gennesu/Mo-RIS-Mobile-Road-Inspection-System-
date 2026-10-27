import os
import json
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

from flask import Flask, jsonify, render_template
from routes.user_route import user_bp
from services.database import fetch_dashboard_stats

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "ai-model" / "Backend"
AI_DIR = BASE_DIR / "ai-model" / "AI"
LOG_DIR = BASE_DIR / "logs"
PREVIEW_PATH = BASE_DIR / "static" / "runtime" / "detection-preview.jpg"
PYTHON_EXE = BASE_DIR / ".venv" / "Scripts" / "python.exe"
if not PYTHON_EXE.exists():
    PYTHON_EXE = Path(sys.executable)

operator_processes = {
    "backend": None,
    "detector": None,
}

# Register Blueprint
app.register_blueprint(user_bp)

# Main Route
@app.route("/home")
@app.route("/")
def landing():
    try:
        dashboard_stats = fetch_dashboard_stats()
    except Exception:
        dashboard_stats = {
            "total": 0,
            "pending": 0,
            "processing": 0,
            "completed": 0,
        }
    return render_template(
        "/landing/index.html", active_page="home", dashboard_stats=dashboard_stats
    )

@app.route("/about")
def about():
    return render_template("/landing/about.html", active_page="about")

@app.route("/contact")
def contact():
    return render_template("/landing/contact.html", active_page="contact")

@app.route("/operator")
def detectpage():
    return render_template("/operator/detect-page.html")


def is_process_running(process):
    return process is not None and process.poll() is None


def is_pid_running(pid):
    if pid is None:
        return False

    result = subprocess.run(
        ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0 and str(pid) in result.stdout


def get_saved_pid(name):
    pid_path = LOG_DIR / f"{name}.pid"
    if not pid_path.exists():
        return None

    try:
        return int(pid_path.read_text(encoding="utf-8").strip())
    except ValueError:
        return None


def is_named_process_running(name):
    process = operator_processes.get(name)
    return is_process_running(process) or is_pid_running(get_saved_pid(name))


def is_backend_ready():
    try:
        with urlopen("http://127.0.0.1:8000/", timeout=1) as response:
            return response.status == 200
    except (OSError, URLError):
        return False


def has_device_location():
    try:
        with urlopen("http://127.0.0.1:8000/device-location", timeout=1) as response:
            if response.status != 200:
                return False

            data = json.loads(response.read().decode("utf-8"))
            return data.get("latitude") is not None and data.get("longitude") is not None
    except (OSError, URLError, ValueError, json.JSONDecodeError):
        return False


def start_background_process(name, command, cwd, env=None):
    LOG_DIR.mkdir(exist_ok=True)
    log_path = LOG_DIR / f"{name}.log"
    log_file = open(log_path, "a", encoding="utf-8")

    process_env = None
    if env:
        process_env = {**os.environ, **env}

    process = subprocess.Popen(
        command,
        cwd=cwd,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        env=process_env,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
    )
    (LOG_DIR / f"{name}.pid").write_text(str(process.pid), encoding="utf-8")
    return process


def stop_process(name):
    process = operator_processes.get(name)
    pid_path = LOG_DIR / f"{name}.pid"

    if is_process_running(process):
        pid = process.pid
    else:
        pid = get_saved_pid(name)

    if pid is None:
        operator_processes[name] = None
        return False

    result = subprocess.run(
        ["taskkill", "/PID", str(pid), "/T", "/F"],
        capture_output=True,
        text=True,
    )
    if pid_path.exists():
        pid_path.unlink()

    operator_processes[name] = None
    return result.returncode == 0


def stop_processes_on_port(port):
    result = subprocess.run(
        ["netstat", "-ano", "-p", "tcp"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return False

    stopped = False
    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) < 5:
            continue

        local_address = parts[1]
        state = parts[3]
        pid = parts[4]

        if not local_address.endswith(f":{port}") or state.upper() != "LISTENING":
            continue

        kill_result = subprocess.run(
            ["taskkill", "/PID", pid, "/T", "/F"],
            capture_output=True,
            text=True,
        )
        stopped = kill_result.returncode == 0 or stopped

    return stopped


def cleanup_preview_files():
    PREVIEW_PATH.parent.mkdir(parents=True, exist_ok=True)
    for preview_file in PREVIEW_PATH.parent.glob(f"{PREVIEW_PATH.stem}*.jpg"):
        try:
            preview_file.unlink()
        except PermissionError:
            pass


@app.post("/operator/start-detection")
def start_detection():
    messages = []
    cleanup_preview_files()

    if is_backend_ready():
        messages.append("Backend sudah berjalan.")
    elif is_named_process_running("backend"):
        messages.append("Backend sedang dijalankan.")
    else:
        operator_processes["backend"] = start_background_process(
            "backend",
            [str(PYTHON_EXE), "-m", "uvicorn", "main:app"],
            BACKEND_DIR,
        )
        messages.append("Backend mulai dijalankan.")

    for _ in range(10):
        if is_backend_ready():
            break
        time.sleep(0.5)

    for _ in range(6):
        if has_device_location():
            break
        time.sleep(0.5)

    if is_named_process_running("detector"):
        messages.append("Detector sudah berjalan.")
    else:
        operator_processes["detector"] = start_background_process(
            "detector",
            [str(PYTHON_EXE), "detect.py"],
            AI_DIR,
            {
                "DETECTION_PREVIEW_PATH": str(PREVIEW_PATH),
                "SHOW_DETECT_WINDOW": "0",
                "DETECT_CONF": "0.4",
                "CAMERA_WIDTH": "1280",
                "CAMERA_HEIGHT": "720",
            },
        )
        messages.append("Detector mulai dijalankan.")

    return jsonify({
        "backend_running": is_backend_ready() or is_named_process_running("backend"),
        "detector_running": is_named_process_running("detector"),
        "messages": messages,
    })


@app.post("/operator/stop-detection")
def stop_detection():
    detector_stopped = stop_process("detector")
    backend_stopped = stop_process("backend")
    if is_backend_ready():
        backend_stopped = stop_processes_on_port(8000) or backend_stopped

    cleanup_preview_files()

    return jsonify({
        "backend_running": is_backend_ready() or is_named_process_running("backend"),
        "detector_running": is_named_process_running("detector"),
        "messages": [
            "Detector dihentikan." if detector_stopped else "Detector tidak berjalan dari tombol operator.",
            "Backend dihentikan." if backend_stopped else "Backend tidak berjalan dari tombol operator.",
        ],
    })


@app.get("/operator/detection-status")
def detection_status():
    return jsonify({
        "backend_running": is_backend_ready() or is_named_process_running("backend"),
        "detector_running": is_named_process_running("detector"),
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5123, debug=True)
