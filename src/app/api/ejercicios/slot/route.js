import { NextResponse } from "next/server";
import crypto from "crypto";
import { getOrCreateCoachCollection } from "@/lib/bunnyUtils";

const BUNNY_API_KEY = process.env.BUNNY_STREAM_API_KEY?.trim();
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID?.trim();

export async function POST(request) {
  try {
    const { titulo, coach_id } = await request.json();

    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
      return NextResponse.json(
        { error: "Credenciales de Bunny Stream no configuradas en el servidor." },
        { status: 500 }
      );
    }

    let collectionId = null;

    // 1. Obtener o crear colección para el coach
    if (coach_id) {
      try {
        collectionId = await getOrCreateCoachCollection(coach_id);
      } catch (colErr) {
        console.warn("Aviso: No se pudo obtener la colección de Bunny:", colErr.message);
      }
    }

    // 2. Crear el objeto de video en la API de Bunny Stream
    const videoPayload = { title: titulo || "Ejercicio Personalizado" };
    if (collectionId) {
      videoPayload.collectionId = collectionId;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const bunnyRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method: "POST",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(videoPayload),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!bunnyRes.ok) {
      const errText = await bunnyRes.text().catch(() => "");
      console.error("Error creando video en Bunny API:", bunnyRes.status, errText);
      return NextResponse.json(
        { error: `Bunny Stream rechazó la creación del video (Código ${bunnyRes.status}): ${errText}` },
        { status: 500 }
      );
    }

    const bunnyVideo = await bunnyRes.json();
    const videoId = bunnyVideo?.guid;

    if (!videoId) {
      return NextResponse.json(
        { error: "No se recibió un identificador GUID válido desde Bunny Stream." },
        { status: 500 }
      );
    }

    // 3. Generar Firma de Autorización Temporal SHA256 para TUS (Expira en 2 horas)
    const expirationTime = Math.floor(Date.now() / 1000) + 7200;
    const signatureString = `${BUNNY_LIBRARY_ID}${BUNNY_API_KEY}${expirationTime}${videoId}`;
    const authSignature = crypto.createHash("sha256").update(signatureString).digest("hex");

    return NextResponse.json({
      bunnyVideoId: videoId,
      libraryId: BUNNY_LIBRARY_ID,
      authSignature,
      expirationTime,
    });
  } catch (err) {
    console.error("Error en API /api/ejercicios/slot:", err);
    return NextResponse.json(
      { error: err.message || "Error al procesar el slot de video" },
      { status: 500 }
    );
  }
}
