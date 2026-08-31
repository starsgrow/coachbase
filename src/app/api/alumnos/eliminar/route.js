import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/supabaseAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function DELETE(req) {
  const auth = await authenticateApiRequest(req);
  
  if (!auth || !auth.coach) {
    return NextResponse.json({ error: "No autorizado o sesión inválida" }, { status: 401 });
  }

  const coachId = auth.coach.id;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de alumno requerido" }, { status: 400 });
    }

    const { error: deleteError } = await supabaseServer
      .from("coach_clientes")
      .delete()
      .eq("id", id)
      .eq("coach_id", coachId); // Solo puede borrar si es su alumno

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("Error eliminando alumno:", err);
    return NextResponse.json(
      { error: "Error al eliminar alumno", details: err.message },
      { status: 500 }
    );
  }
}
