import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QRLoginScanner({ onScanSuccess, onScanError }) {
  const scannerRef = useRef(null);
  const hasScannedRef = useRef(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [starting, setStarting] = useState(false);

  const forceStopTracks = useCallback(() => {
    try {
      const container = document.getElementById("qr-reader");
      if (!container) return;

      const videos = container.querySelectorAll("video");
      videos.forEach((video) => {
        const stream = video.srcObject;
        if (stream && typeof stream.getTracks === "function") {
          stream.getTracks().forEach((track) => track.stop());
        }
        video.pause?.();
        video.srcObject = null;
      });
    } catch (error) {
      console.warn("Error forzando cierre de tracks QR:", error);
    }
  }, []);

  const stopScanner = useCallback(async () => {
    try {
      const scanner = scannerRef.current;

      if (scanner) {
        try {
          await scanner.stop();
        } catch (error) {
          console.warn("Error al detener QR:", error);
        }

        try {
          await scanner.clear();
        } catch (error) {
          console.warn("Error al limpiar QR:", error);
        }

        scannerRef.current = null;
      }

      forceStopTracks();
    } catch (error) {
      console.warn("Error cerrando lector QR:", error);
    } finally {
      setCameraOn(false);
      setStarting(false);
      hasScannedRef.current = false;
    }
  }, [forceStopTracks]);

  const startScanner = useCallback(async () => {
    if (cameraOn || starting) return;

    setStarting(true);
    hasScannedRef.current = false;

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
          disableFlip: false,
        },
        async (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;

          try {
            let token = decodedText;

            if (decodedText.includes("/")) {
              const parts = decodedText.split("/").filter(Boolean);
              token = parts[parts.length - 1];
            }

            await stopScanner();
            await onScanSuccess(token);
          } catch (error) {
            console.warn("Error procesando QR:", error);
            hasScannedRef.current = false;
            onScanError?.("No se pudo interpretar el QR.");
          }
        },
        () => {}
      );

      setCameraOn(true);
    } catch (error) {
      console.warn("No se pudo iniciar la cámara QR:", error);
      setCameraOn(false);
      onScanError?.("No se pudo iniciar la cámara para leer el QR.");
    } finally {
      setStarting(false);
    }
  }, [cameraOn, starting, stopScanner, onScanSuccess, onScanError]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className="qr-login-box">
      <div id="qr-reader" />

      <div className="webcam-actions" style={{ marginTop: 12 }}>
        {!cameraOn ? (
          <button
            type="button"
            className="btn btn-sm"
            onClick={startScanner}
            disabled={starting}
          >
            {starting ? "Iniciando cámara..." : "📷 Activar cámara QR"}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-sm"
            onClick={stopScanner}
          >
            Detener cámara
          </button>
        )}
      </div>
    </div>
  );
}