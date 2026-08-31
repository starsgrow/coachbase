import { supabaseServer } from '@/lib/supabaseServer';
import { authenticateApiRequest } from '@/lib/supabaseAuth';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
  try {
    // Auth Guard: validar sesión del usuario
    const auth = await authenticateApiRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "ID de rutina es requerido" }, { status: 400 });
    }

    // Solo permitir eliminar rutinas del coach autenticado
    const { error } = await supabaseServer
      .from("coach_rutinas")
      .delete()
      .eq("id", id)
      .eq("coach_id", auth.coach.id);

    if (error) {
      console.error("Error eliminando rutina:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Excepción en eliminar rutina:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
