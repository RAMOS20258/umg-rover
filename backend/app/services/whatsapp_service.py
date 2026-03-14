import re
import threading
import time
import pywhatkit as kit

def normalizar_numero(numero: str) -> str:
    """
    Convierte un número a formato internacional.
    Ejemplo Guatemala: 50212345678 -> +50212345678
    """
    if not numero:
        raise ValueError("El número de teléfono es obligatorio.")

    numero = numero.strip().replace(" ", "").replace("-", "")

    if numero.startswith("+"):
        limpio = "+" + re.sub(r"\D", "", numero)
    else:
        limpio = "+" + re.sub(r"\D", "", numero)

    if not re.fullmatch(r"\+\d{8,15}", limpio):
        raise ValueError("Número inválido. Usa formato internacional, por ejemplo +50212345678")

    return limpio


def enviar_whatsapp_async(numero: str, mensaje: str, wait_time: int = 20):
    """
    Envía mensaje usando WhatsApp Web en segundo plano.
    Requiere navegador disponible y sesión iniciada en WhatsApp Web.
    """
    numero = normalizar_numero(numero)

    if not mensaje or not mensaje.strip():
        raise ValueError("El mensaje está vacío.")

    def _job():
        try:
            # Abre WhatsApp Web, espera, escribe y envía el mensaje
            kit.sendwhatmsg_instantly(
                phone_no=numero,
                message=mensaje,
                wait_time=wait_time,
                tab_close=True,
                close_time=3
            )
        except Exception as e:
            print(f"[PyWhatKit] Error enviando mensaje: {e}")

    hilo = threading.Thread(target=_job, daemon=True)
    hilo.start()
    return True