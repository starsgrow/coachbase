import cv2
import os
import base64
import json
from dotenv import load_dotenv
from openai import OpenAI

# Cargar API Key desde .env.local
load_dotenv(r"F:\olympapp-web\olympo-coaches\.env.local")
api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    print("❌ Error: OPENAI_API_KEY no encontrada en .env.local")
    exit(1)

client = OpenAI(api_key=api_key)

VIDEOS_DIR = r"F:\fitpak\+400 Animaciones de entrenamientos - VERSION ACTUALIZADA-20260801T042747Z-1-001\+400 Animaciones de entrenamientos - VERSION ACTUALIZADA\VÍDEOS"

def frame_to_base64(frame):
    _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    return base64.b64encode(buffer).decode('utf-8')

def analyze_video(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    duration = total_frames / fps

    # Extraer frame del medio (ejercicio) y frame final (marca de agua)
    mid_frame_idx = total_frames // 2
    last_frame_idx = max(0, total_frames - int(fps * 0.5))

    cap.set(cv2.CAP_PROP_POS_FRAMES, mid_frame_idx)
    ret1, frame_mid = cap.read()

    cap.set(cv2.CAP_PROP_POS_FRAMES, last_frame_idx)
    ret2, frame_last = cap.read()

    cap.release()

    if not ret1 or not ret2:
        return None

    b64_mid = frame_to_base64(frame_mid)
    b64_last = frame_to_base64(frame_last)

    # Prompt para GPT-4o Vision
    prompt = """
Analiza estas 2 imágenes extraídas de una animación de ejercicio fitness:
- La Imagen 1 muestra la ejecución del ejercicio.
- La Imagen 2 muestra el fotograma final del video.

Responde ÚNICAMENTE en formato JSON estricto con las siguientes claves:
{
  "nombre_ejercicio": "Nombre del ejercicio en español (ej: Press de Banca Plano con Mancuernas)",
  "grupo_muscular": "Pecho | Espalda | Cuádriceps | Glúteos | Hombros | Bíceps | Tríceps | Abdominales | Pantorrillas",
  "equipamiento": "Barra | Mancuernas | Polea | Máquina | Peso Corporal | Banda de Resistencia",
  "tiene_logo_final": true/false (true si la Imagen 2 contiene un logo, marca de agua, texto o pantalla de cierre promocional)
}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64_mid}", "detail": "low"},
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64_last}", "detail": "low"},
                    },
                ],
            }
        ],
        max_tokens=300,
    )

    content = response.choices[0].message.content.strip()
    # Limpiar markdown de json si lo trae
    if content.startswith("```json"):
        content = content[7:-3].strip()
    elif content.startswith("```"):
        content = content[3:-3].strip()

    try:
        data = json.loads(content)
        data["duracion_segundos"] = round(duration, 2)
        return data
    except Exception as e:
        print(f"Error parseando JSON: {e}, contenido: {content}")
        return None

if __name__ == "__main__":
    files = [f for f in os.listdir(VIDEOS_DIR) if f.endswith(".mp4")][:5]
    print(f"🔍 Analizando los primeros {len(files)} videos de prueba con GPT-4o-mini...\n")

    for f in files:
        full_path = os.path.join(VIDEOS_DIR, f)
        res = analyze_video(full_path)
        print(f"📹 ARCHIVO: {f}")
        if res:
            print(f"   🏋️ Ejercicio: {res.get('nombre_ejercicio')}")
            print(f"   💪 Músculo:   {res.get('grupo_muscular')}")
            print(f"   🏋️ Equipamiento: {res.get('equipamiento')}")
            print(f"   🏷️ Logo final: {'⚠️ SÍ (Requiere recorte)' if res.get('tiene_logo_final') else '✅ NO (Limpio)'}")
            print(f"   ⏱️ Duración:   {res.get('duracion_segundos')}s")
        else:
            print("   ❌ Error procesando el video.")
        print("-" * 50)
