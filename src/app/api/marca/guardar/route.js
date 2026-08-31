import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/supabaseAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req) {
  const auth = await authenticateApiRequest(req);
  
  if (!auth || !auth.coach) {
    return NextResponse.json({ error: "No autorizado o sesión inválida" }, { status: 401 });
  }

  const coachId = auth.coach.id;

  try {
    const { nombre_marca, color_primario, color_secundario, logo_url } = await req.json();

    const updates = {};
    if (nombre_marca !== undefined) updates.nombre_marca = nombre_marca;
    if (color_primario !== undefined) updates.color_primario = color_primario;
    if (color_secundario !== undefined) updates.color_secundario = color_secundario;
    if (logo_url !== undefined) updates.logo_url = logo_url;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const { data, error: updateError } = await supabaseServer
      .from("coaches")
      .update(updates)
      .eq("id", coachId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(data);
  } catch (err) {
    console.error("Error actualizando marca:", err);
    return NextResponse.json(
      { error: "Error al guardar la marca", details: err.message },
      { status: 500 }
    );
  }
}
