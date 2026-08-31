import { supabaseServer } from "@/lib/supabaseServer";
import { authenticateApiRequest } from "@/lib/supabaseAuth";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { getOrCreateCoachCollection } from "@/lib/bunnyUtils";

const BUNNY_API_KEY = process.env.BUNNY_STREAM_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;

export async function POST(request) {
  try {
    // Auth Guard: validar sesión del usuario
    const auth = await authenticateApiRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { titulo, categoria, descripcion, solo_premium } = await request.json();

    // Usar el coach_id del usuario autenticado
    const coach_id = auth.coach.id;

    if (!titulo) {
      return NextResponse.json({ error: "Título es requerido" }, { status: 400 });
    }

    let videoId = `demo-${Date.now()}`;

    // Obtener o crear colección específica para este coach en Bunny CDN
    const collectionId = await getOrCreateCoachCollection(coach_id);

    // Si Bunny Stream está configurado, creamos el slot real en la API de Bunny
    if (BUNNY_API_KEY && BUNNY_LIBRARY_ID) {
      const videoPayload = { title: titulo };
      if (collectionId) {
        videoPayload.collectionId = collectionId;
      }

      const bunnyRes = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
        {
          method: "POST",
          headers: {
            AccessKey: BUNNY_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(videoPayload)
        }
      );
      const bunnyVideo = await bunnyRes.json();
      if (bunnyVideo?.guid) {
        videoId = bunnyVideo.guid;
      }
    }

    // Generar Firma de Autorización Temporal SHA256 (Expira en 1 hora)
    const expirationTime = Math.floor(Date.now() / 1000) + 3600;
    const signatureString = `${BUNNY_LIBRARY_ID || 'demo'}${BUNNY_API_KEY || 'demo'}${expirationTime}${videoId}`;
    const authSignature = crypto.createHash("sha256").update(signatureString).digest("hex");

    // Guardar registro inicial en Supabase
    let dbData = null;
    const { data, error } = await supabaseServer
      .from("coach_videos")
      .insert({
        coach_id,
        bunny_video_id: videoId,
        titulo,
        categoria: categoria || 'general',
        descripcion: descripcion || '',
        solo_premium: !!solo_premium,
        estado: "procesando"
      })
      .select()
      .single();

    if (error) {
      console.error("Error al guardar en Supabase:", error);
    } else {
      dbData = data;
    }

    return NextResponse.json({
      dbId: dbData?.id || null,
      bunnyVideoId: videoId,
      libraryId: BUNNY_LIBRARY_ID || 'demo',
      authSignature,
      expirationTime
    });
  } catch (err) {
    console.error("Error en API /api/videos/crear:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
