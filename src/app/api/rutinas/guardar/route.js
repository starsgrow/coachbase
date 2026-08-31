import { supabaseServer } from '@/lib/supabaseServer';
import { authenticateApiRequest } from '@/lib/supabaseAuth';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Auth Guard: validar sesión del usuario
    const auth = await authenticateApiRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, cliente_id, nombre_rutina, descripcion, objetivo, nivel, dias_semana, estructura_json } = body;

    // Usar el coach_id del usuario autenticado, NO del body
    const coach_id = auth.coach.id;

    if (!nombre_rutina || !nombre_rutina.trim()) {
      return NextResponse.json({ error: "El nombre de la rutina es requerido" }, { status: 400 });
    }

    const payload = {
      coach_id,
      cliente_id: cliente_id || null,
      nombre_rutina: nombre_rutina.trim(),
      descripcion: descripcion || "",
      objetivo: objetivo || "hipertrofia",
      nivel: nivel || "intermedio",
      dias_semana: dias_semana || (Array.isArray(estructura_json) ? estructura_json.length : 4),
      estructura_json: estructura_json || [],
      activa: true,
      updated_at: new Date().toISOString()
    };

    let data, error;

    if (id) {
      // UPDATE — verificar que la rutina pertenece al coach autenticado
      const res = await supabaseServer
        .from("coach_rutinas")
        .update(payload)
        .eq("id", id)
        .eq("coach_id", coach_id)
        .select("*, coach_clientes(nombre, email)")
        .single();
      data = res.data;
      error = res.error;
    } else {
      // INSERT
      const res = await supabaseServer
        .from("coach_rutinas")
        .insert(payload)
        .select("*, coach_clientes(nombre, email)")
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error("Error guardando rutina:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, rutina: data });
  } catch (err) {
    console.error("Excepción en guardar rutina:", err);
    return NextResponse.json({ error: err.message || "Error al guardar rutina" }, { status: 500 });
  }
}

