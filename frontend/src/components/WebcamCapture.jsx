import { useEffect, useRef, useState } from "react";
import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";

let segmenterInstance = null;
let segmenterLoadingPromise = null;

async function getSegmenter() {
  if (segmenterInstance) return segmenterInstance;
  if (segmenterLoadingPromise) return segmenterLoadingPromise;

  segmenterLoadingPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    const segmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite",
      },
      runningMode: "IMAGE",
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });

    segmenterInstance = segmenter;
    return segmenter;
  })();

  return segmenterLoadingPromise;
}

export default function WebcamCapture({
  label = "Tomar foto",
  onCapture,
  preview,
  height = 220,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const startCamera = async () => {
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
    } catch (err) {
      console.error(err);
      setError("No se pudo abrir la cámara. Revisa permisos del navegador.");
    }
  };

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    } catch (err) {
      console.warn("Error cerrando cámara:", err);
    }

    setCameraOn(false);
  };

  const detectFaceBox = async (sourceCanvas) => {
    try {
      if (!("FaceDetector" in window)) return null;

      const detector = new window.FaceDetector({
        fastMode: true,
        maxDetectedFaces: 1,
      });

      const faces = await detector.detect(sourceCanvas);
      if (!faces?.length) return null;

      const box = faces[0].boundingBox;
      if (!box) return null;

      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      };
    } catch (err) {
      console.warn("No se pudo detectar el rostro:", err);
      return null;
    }
  };

  const getCropBox = async (rawCanvas) => {
    const faceBox = await detectFaceBox(rawCanvas);

    if (faceBox) {
      const marginX = faceBox.width * 0.8;
      const marginTop = faceBox.height * 0.25;
      const marginBottom = faceBox.height * 1.65;

      let sx = Math.max(0, faceBox.x - marginX / 2);
      let sy = Math.max(0, faceBox.y - marginTop);

      let sw = Math.min(rawCanvas.width - sx, faceBox.width + marginX);
      let sh = Math.min(
        rawCanvas.height - sy,
        faceBox.height + marginTop + marginBottom
      );

      const side = Math.max(sw, sh);
      const cx = sx + sw / 2;
      const cy = sy + sh / 2 + faceBox.height * 0.15;

      sx = Math.max(0, cx - side / 2);
      sy = Math.max(0, cy - side / 2);
      sw = side;
      sh = side;

      if (sx + sw > rawCanvas.width) sx = rawCanvas.width - sw;
      if (sy + sh > rawCanvas.height) sy = rawCanvas.height - sh;

      return {
        sx: Math.max(0, sx),
        sy: Math.max(0, sy),
        sw,
        sh,
      };
    }

    const size = Math.min(rawCanvas.width, rawCanvas.height);
    return {
      sx: (rawCanvas.width - size) / 2,
      sy: (rawCanvas.height - size) / 2,
      sw: size,
      sh: size,
    };
  };

  const buildWhiteBackgroundPortrait = async (video) => {
    const rawCanvas = document.createElement("canvas");
    rawCanvas.width = video.videoWidth;
    rawCanvas.height = video.videoHeight;
    const rawCtx = rawCanvas.getContext("2d");
    rawCtx.drawImage(video, 0, 0, rawCanvas.width, rawCanvas.height);

    const { sx, sy, sw, sh } = await getCropBox(rawCanvas);

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = 500;
    cropCanvas.height = 500;
    const cropCtx = cropCanvas.getContext("2d");
    cropCtx.drawImage(rawCanvas, sx, sy, sw, sh, 0, 0, 500, 500);

    let segmentedMask = null;

    try {
      const segmenter = await getSegmenter();
      const result = await segmenter.segment(cropCanvas);

      if (result?.categoryMask) {
        segmentedMask = result.categoryMask;
      }
    } catch (err) {
      console.warn("No se pudo segmentar la imagen:", err);
    }

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = 500;
    outputCanvas.height = 500;
    const outCtx = outputCanvas.getContext("2d");

    outCtx.fillStyle = "#ffffff";
    outCtx.fillRect(0, 0, 500, 500);

    if (!segmentedMask) {
      outCtx.drawImage(cropCanvas, 0, 0);
      return outputCanvas.toDataURL("image/jpeg", 0.95);
    }

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = 500;
    maskCanvas.height = 500;
    const maskCtx = maskCanvas.getContext("2d");

    const maskArray = segmentedMask.getAsUint8Array();
    const imageData = maskCtx.createImageData(500, 500);

    for (let i = 0; i < maskArray.length; i++) {
      const alpha = maskArray[i] > 0 ? 0 : 255;
      const p = i * 4;

      imageData.data[p] = 255;
      imageData.data[p + 1] = 255;
      imageData.data[p + 2] = 255;
      imageData.data[p + 3] = alpha;
    }

    maskCtx.putImageData(imageData, 0, 0);

    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = 500;
    blurCanvas.height = 500;
    const blurCtx = blurCanvas.getContext("2d");

    blurCtx.filter = "blur(4px)";
    blurCtx.drawImage(maskCanvas, 0, 0);

    maskCtx.clearRect(0, 0, 500, 500);
    maskCtx.drawImage(blurCanvas, 0, 0);

    const personCanvas = document.createElement("canvas");
    personCanvas.width = 500;
    personCanvas.height = 500;
    const personCtx = personCanvas.getContext("2d");

    personCtx.drawImage(cropCanvas, 0, 0);
    personCtx.globalCompositeOperation = "destination-in";
    personCtx.drawImage(maskCanvas, 0, 0);

    outCtx.fillStyle = "#ffffff";
    outCtx.fillRect(0, 0, 500, 500);
    outCtx.drawImage(personCanvas, 0, 0);

    return outputCanvas.toDataURL("image/jpeg", 0.95);
  };

  const capture = async () => {
    const video = videoRef.current;

    if (!video) {
      setError("No hay video disponible para capturar.");
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      setError("La cámara aún no está lista. Espera un momento e inténtalo otra vez.");
      return;
    }

    try {
      setProcessing(true);
      setError("");

      const dataUrl = await buildWhiteBackgroundPortrait(video);
      onCapture?.(dataUrl);
      stopCamera();
    } catch (err) {
      console.error(err);
      setError("No se pudo procesar la foto.");
    } finally {
      setProcessing(false);
    }
  };

  const clearPreview = () => {
    onCapture?.(null);
    setError("");
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="webcam-card">
      <div className="webcam-stage" style={{ minHeight: height }}>
        {preview ? (
          <img src={preview} alt="captura" className="webcam-preview" />
        ) : (
          <>
            <video
              ref={videoRef}
              className="webcam-video"
              playsInline
              muted
              autoPlay
            />
            <div className="webcam-guide">
              <div className="webcam-guide-label">
                Centra tu rostro dentro del marco
              </div>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="auth-error">
          <span>⚠</span> {error}
        </div>
      )}

      <div className="webcam-actions">
        {!cameraOn && !preview && (
          <button type="button" className="btn btn-sm" onClick={startCamera}>
            🎥 Activar cámara
          </button>
        )}

        {cameraOn && !preview && (
          <>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={capture}
              disabled={processing}
            >
              {processing ? "Procesando..." : label}
            </button>

            <button
              type="button"
              className="btn btn-sm"
              onClick={stopCamera}
              disabled={processing}
            >
              Detener cámara
            </button>
          </>
        )}

        {preview && (
          <button type="button" className="btn btn-sm" onClick={clearPreview}>
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}