import base64
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from app.core.config import FACES_DIR

CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


class FaceError(Exception):
    pass


def decode_b64_to_bytes(data: str) -> bytes:
    clean = (data or "").split(",")[-1].strip()
    if not clean:
        raise FaceError("No se recibió imagen facial")
    try:
        return base64.b64decode(clean)
    except Exception as exc:
        raise FaceError("Imagen facial inválida") from exc


def bytes_to_image(image_bytes: bytes):
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise FaceError("No se pudo leer la imagen facial")
    return image


def _preprocess_gray(gray: np.ndarray) -> np.ndarray:
    # Reduce ruido y mejora contraste sin exagerar
    gray = cv2.GaussianBlur(gray, (5, 5), 0)

    # CLAHE ayuda más que equalizeHist cuando cambia la iluminación
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    return gray


def detect_largest_face(image: np.ndarray):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = _preprocess_gray(gray)

    faces = CASCADE.detectMultiScale(
        gray,
        scaleFactor=1.03,
        minNeighbors=4,
        minSize=(70, 70)
    )

    if len(faces) == 0:
        raise FaceError("No se detectó un rostro claro en la imagen")

    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])

    # margen extra para capturar mejor ojos / frente / mentón
    margin_x = int(w * 0.18)
    margin_y = int(h * 0.22)

    x1 = max(0, x - margin_x)
    y1 = max(0, y - margin_y)
    x2 = min(gray.shape[1], x + w + margin_x)
    y2 = min(gray.shape[0], y + h + margin_y)

    face = gray[y1:y2, x1:x2]

    if face.size == 0:
        raise FaceError("No se pudo recortar correctamente el rostro")

    # Tamaño algo mayor para conservar mejor detalle
    face = cv2.resize(face, (200, 200), interpolation=cv2.INTER_CUBIC)

    # Suavizado leve adicional
    face = cv2.GaussianBlur(face, (3, 3), 0)

    return face


def extract_face_features(face: np.ndarray):
    # Normalización
    norm = cv2.normalize(face, None, 0, 255, cv2.NORM_MINMAX)

    # Histograma
    hist = cv2.calcHist([norm], [0], None, [64], [0, 256])
    cv2.normalize(hist, hist)

    # Imagen reducida para vector de textura
    small = cv2.resize(norm, (100, 100), interpolation=cv2.INTER_AREA)
    vec = small.astype(np.float32).flatten()

    # Bordes ayudan cuando hay lentes / iluminación distinta
    edges = cv2.Canny(norm, 60, 120)
    edge_vec = edges.astype(np.float32).flatten()

    return {
        "norm": norm,
        "hist": hist,
        "vec": vec,
        "edge_vec": edge_vec,
    }


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def save_registered_face(user_id: str, face_base64: Optional[str]):
    if not face_base64:
        return None

    image_bytes = decode_b64_to_bytes(face_base64)
    image = bytes_to_image(image_bytes)

    # Validar que sí exista rostro
    detect_largest_face(image)

    path = FACES_DIR / f"{user_id}.jpg"
    path.write_bytes(image_bytes)
    return str(path)


def load_registered_face(user_id: str) -> Path:
    path = FACES_DIR / f"{user_id}.jpg"
    if not path.exists():
        raise FaceError("El usuario no tiene rostro registrado")
    return path


def compare_faces(registered_path: Path, probe_base64: str):
    registered_img = bytes_to_image(registered_path.read_bytes())
    probe_img = bytes_to_image(decode_b64_to_bytes(probe_base64))

    reg_face = detect_largest_face(registered_img)
    probe_face = detect_largest_face(probe_img)

    reg_feat = extract_face_features(reg_face)
    probe_feat = extract_face_features(probe_face)

    # 1. Histograma
    hist_score = float(
        cv2.compareHist(reg_feat["hist"], probe_feat["hist"], cv2.HISTCMP_CORREL)
    )

    # 2. Similitud por textura general
    cosine_score = cosine_similarity(reg_feat["vec"], probe_feat["vec"])

    # 3. Similitud por bordes
    edge_score = cosine_similarity(reg_feat["edge_vec"], probe_feat["edge_vec"])

    # Limitar a rango razonable
    hist_score = max(0.0, min(hist_score, 1.0))
    cosine_score = max(0.0, min(cosine_score, 1.0))
    edge_score = max(0.0, min(edge_score, 1.0))

    # Ponderación más estable para webcam común
    score = round(
        (hist_score * 0.25) +
        (cosine_score * 0.50) +
        (edge_score * 0.25),
        4
    )

    threshold = 0.57
    accepted = score >= threshold

    return {
        "accepted": accepted,
        "score": score,
        "threshold": threshold,
        "debug": {
            "hist_score": round(hist_score, 4),
            "cosine_score": round(cosine_score, 4),
            "edge_score": round(edge_score, 4),
        }
    }