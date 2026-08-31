import { supabaseServer } from "@/lib/supabaseServer";
import { authenticateApiRequest } from "@/lib/supabaseAuth";
import { NextResponse } from "next/server";

const BUNNY_CDN_HOSTNAME = process.env.NEXT_PUBLIC_BUNNY_CDN || "vz-cddd003b-54d.b-cdn.net";

export async function POST(request) {
  try {
    // Auth Guard: validar sesión del usuario
    const auth = await authenticateApiRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { ejercicio_id, bunny_video_id, es_ejercicio_global } = await request.json();

    // Usar el coach_id del usuario autenticado
    const coach_id = auth.coach.id;

    if (!ejercicio_id) {
      return NextResponse.json({ error: "Ejercicio ID (o Slug) es requerido" }, { status: 400 });
    }

    let video_demo_url = null;
    let thumbnail_url = null;

    if (bunny_video_id && !bunny_video_id.startsWith("demo-")) {
      video_demo_url = `https://${BUNNY_CDN_HOSTNAME}/${bunny_video_id}/playlist.m3u8`;
      thumbnail_url = `https://${BUNNY_CDN_HOSTNAME}/${bunny_video_id}/thumbnail.jpg`;
    }

    if (es_ejercicio_global) {
      // Buscar en tabla_ejercicios por slug (o id si existiera)
      let ejGlobal = null;
      const { data: bySlug } = await supabaseServer
        .from("tabla_ejercicios")
        .select("*")
        .eq("slug", ejercicio_id)
        .maybeSingle();

      ejGlobal = bySlug;

      if (!ejGlobal) {
        const { data: byId } = await supabaseServer
          .from("tabla_ejercicios")
          .select("*")
          .eq("nombre_ejercicio", ejercicio_id)
          .maybeSingle();
        ejGlobal = byId;
      }

      if (ejGlobal) {
        const payload = {
          coach_id,
          nombre: ejGlobal.nombre_ejercicio || ejGlobal.nombre,
          slug: `${ejGlobal.slug || 'ejercicio'}-${Date.now().toString().slice(-4)}`,
          grupo_muscular: ejGlobal.musculos_principales || ejGlobal.grupo_muscular || "General",
          equipamiento: Array.isArray(ejGlobal.equipamiento_necesario)
            ? ejGlobal.equipamiento_necesario.join(', ')
            : (ejGlobal.equipamiento || "General"),
          dificultad: "intermedio",
          descripcion: ejGlobal.descripcion || "",
          video_demo_url,
          thumbnail_url,
          es_publico: true
        };

        const { data: nuevoCoachEj, error } = await supabaseServer
          .from("coach_ejercicios")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, ejercicio: nuevoCoachEj, es_variante_nueva: true });
      }
    } else {
      // Si ya es un ejercicio propio en coach_ejercicios, actualizamos su video directamente
      // Verificar que el ejercicio pertenece al coach autenticado
      const { data: ejActualizado, error } = await supabaseServer
        .from("coach_ejercicios")
        .update({
          video_demo_url,
          thumbnail_url
        })
        .eq("id", ejercicio_id)
        .eq("coach_id", coach_id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, ejercicio: ejActualizado });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error guardando variante de video:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
