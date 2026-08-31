import { supabaseServer } from "@/lib/supabaseServer";
import { authenticateApiRequest } from "@/lib/supabaseAuth";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // Auth Guard: validar sesión del usuario
    const auth = await authenticateApiRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { ejercicio_id, es_activo } = await request.json();

    // Usar el coach_id del usuario autenticado
    const coach_id = auth.coach.id;

    if (!ejercicio_id) {
      return NextResponse.json({ error: "ejercicio_id es requerido" }, { status: 400 });
    }

    const esPublicoBool = !!es_activo;

    // Buscar si ya existe un registro en coach_ejercicios (por ID o por slug)
    let ejCoach = null;

    if (ejercicio_id.length > 20) {
      const { data: byId } = await supabaseServer
        .from("coach_ejercicios")
        .select("*")
        .eq("id", ejercicio_id)
        .maybeSingle();
      ejCoach = byId;
    }

    if (!ejCoach) {
      const { data: bySlug } = await supabaseServer
        .from("coach_ejercicios")
        .select("*")
        .eq("slug", ejercicio_id)
        .maybeSingle();
      ejCoach = bySlug;
    }

    if (!ejCoach) {
      const { data: byLikeSlug } = await supabaseServer
        .from("coach_ejercicios")
        .select("*")
        .ilike("slug", `${ejercicio_id}%`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (byLikeSlug && byLikeSlug.length > 0) {
        ejCoach = byLikeSlug[0];
      }
    }

    if (ejCoach) {
      // Si el ejercicio se vuelve a poner VISIBLE (true) y NO tiene video propio subido,
      // eliminamos la fila de preferencia para no dejar registros huérfanos
      if (esPublicoBool && !ejCoach.video_demo_url) {
        await supabaseServer.from("coach_ejercicios").delete().eq("id", ejCoach.id);
        return NextResponse.json({ success: true, eliminado: true });
      } else {
        // Actualizar la visibilidad
        const { data: actualizado, error } = await supabaseServer
          .from("coach_ejercicios")
          .update({ es_publico: esPublicoBool })
          .eq("id", ejCoach.id)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, ejercicio: actualizado });
      }
    } else if (!esPublicoBool) {
      // Si se oculta (esPublicoBool = false) y no existía registro, clonamos con es_publico: false
      const { data: ejGlobal } = await supabaseServer
        .from("tabla_ejercicios")
        .select("*")
        .eq("slug", ejercicio_id)
        .maybeSingle();

      if (ejGlobal) {
        const payload = {
          nombre: ejGlobal.nombre_ejercicio || ejGlobal.nombre,
          slug: ejGlobal.slug,
          grupo_muscular: ejGlobal.musculos_principales || ejGlobal.grupo_muscular || "General",
          equipamiento: Array.isArray(ejGlobal.equipamiento_necesario)
            ? ejGlobal.equipamiento_necesario.join(", ")
            : (ejGlobal.equipamiento || "General"),
          dificultad: "intermedio",
          descripcion: ejGlobal.descripcion || "",
          es_publico: false
        };

        payload.coach_id = coach_id;

        const { data: nuevoCoachEj, error } = await supabaseServer
          .from("coach_ejercicios")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, ejercicio: nuevoCoachEj });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error guardando visibilidad:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
