import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WEBHOOK_SECRET = process.env.BUNNY_WEBHOOK_SECRET;
const BUNNY_CDN_HOSTNAME = process.env.NEXT_PUBLIC_BUNNY_CDN || "vz-cddd003b-54d.b-cdn.net";

export async function POST(request) {
  try {
    const signature = request.headers.get("Signature");
    const payloadStr = await request.text();

    // Validar firma HMAC del webhook si existe el secret configurado
    if (WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(payloadStr)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error("⛔ Firma de Webhook no coincide");
        return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
      }
    }

    const payload = JSON.parse(payloadStr);
    const videoId = payload.VideoId;
    const status = payload.Status;

    // Status 4 = VideoEncodingCompleted ✅
    if (status === 4) {
      await supabase
        .from("coach_videos")
        .update({
          estado: "listo",
          url_stream: `https://${BUNNY_CDN_HOSTNAME}/${videoId}/playlist.m3u8`,
          thumbnail_url: `https://${BUNNY_CDN_HOSTNAME}/${videoId}/thumbnail.jpg`,
          procesado_en: new Date().toISOString()
        })
        .eq("bunny_video_id", videoId);
    }

    // Status 5 = VideoEncodingFailed ❌ (Manejo de Fallos)
    if (status === 5) {
      await supabase
        .from("coach_videos")
        .update({
          estado: "error",
          error_detalle: "Error al procesar o codificar el video en los servidores."
        })
        .eq("bunny_video_id", videoId);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Error procesando Webhook de video:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
