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

    const {
      nombre,
      grupo_muscular,
      musculos_secundarios,
      equipamiento,
      dificultad,
      descripcion,
      beneficios,
      errores_comunes,
      bunny_video_id
    } = await request.json();

    // Usar el coach_id del usuario autenticado
    const coach_id = auth.coach.id;

    if (!nombre || !grupo_muscular) {
      return NextResponse.json(
        { error: "Nombre y Grupo Muscular son obligatorios" },
        { status: 400 }
      );
    }

    const slug = nombre
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    let video_demo_url = null;
    let thumbnail_url = null;

    if (bunny_video_id && !bunny_video_id.startsWith("demo-")) {
      video_demo_url = `https://${BUNNY_CDN_HOSTNAME}/${bunny_video_id}/playlist.m3u8`;
      thumbnail_url = `https://${BUNNY_CDN_HOSTNAME}/${bunny_video_id}/thumbnail.jpg`;
    }

    // Normalizar dificultad al ENUM de PostgreSQL ('principiante' | 'intermedio' | 'avanzado')
    let validDificultad = "intermedio";
    const rawDificultad = Array.isArray(dificultad) ? dificultad.join(", ") : String(dificultad || "");
    const lowerDif = rawDificultad.toLowerCase();
    if (lowerDif.includes("avanzado")) {
      validDificultad = "avanzado";
    } else if (lowerDif.includes("intermedio")) {
      validDificultad = "intermedio";
    } else if (lowerDif.includes("principiante")) {
      validDificultad = "principiante";
    }

    const formatArray = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string" && val.trim()) return val.split(",").map((s) => s.trim()).filter(Boolean);
      return [];
    };

    // Insertar en coach_ejercicios
    const payload = {
      coach_id,
      nombre,
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      grupo_muscular,
      musculos_secundarios: formatArray(musculos_secundarios),
      equipamiento: equipamiento || "General",
      dificultad: validDificultad,
      descripcion: descripcion || "",
      beneficios: formatArray(beneficios),
      errores_comunes: formatArray(errores_comunes),
      video_demo_url,
      thumbnail_url,
      es_publico: true
    };

    const { data, error } = await supabaseServer
      .from("coach_ejercicios")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error guardando en coach_ejercicios:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, ejercicio: data });
  } catch (err) {
    console.error("Error en API /api/ejercicios/guardar:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
