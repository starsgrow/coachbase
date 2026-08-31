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
    const {
      id,
      nombre,
      email,
      telefono,
      estado,
      objetivo,
      nivel,
      peso_kg,
      altura_cm,
      grasa_corporal,
      tiene_masa_muscular_alta,
      lesiones,
      rutina_activa_id,
      rutina_nombre,
      plan_suscripcion,
      fecha_vencimiento,
      calorias_meta,
      proteinas_meta,
      carbohidratos_meta,
      grasas_meta,
      notas_privadas,
      historial_medidas,
    } = await req.json();

    if (!nombre) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const metadata = {
      objetivo: objetivo || "Hipertrofia",
      nivel: nivel || "Intermedio",
      peso_kg: peso_kg ? parseFloat(peso_kg) : null,
      altura_cm: altura_cm ? parseFloat(altura_cm) : null,
      grasa_corporal: grasa_corporal ? parseFloat(grasa_corporal) : null,
      tiene_masa_muscular_alta: Boolean(tiene_masa_muscular_alta),
      lesiones: lesiones || "",
      rutina_activa_id: rutina_activa_id || null,
      rutina_nombre: rutina_nombre || null,
      plan_suscripcion: plan_suscripcion || "Mensual",
      fecha_vencimiento: fecha_vencimiento || null,
      calorias_meta: calorias_meta ? parseInt(calorias_meta) : null,
      proteinas_meta: proteinas_meta ? parseInt(proteinas_meta) : null,
      carbohidratos_meta: carbohidratos_meta ? parseInt(carbohidratos_meta) : null,
      grasas_meta: grasas_meta ? parseInt(grasas_meta) : null,
      notas_privadas: notas_privadas || "",
      historial_medidas: Array.isArray(historial_medidas) ? historial_medidas : [],
    };

    const notasJson = JSON.stringify(metadata);

    let rawData;

    if (id) {
      // Editar alumno existente
      const { data, error: updateError } = await supabaseServer
        .from("coach_clientes")
        .update({
          nombre,
          email: email || null,
          telefono: telefono || null,
          estado: estado || "activo",
          notas: notasJson,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("coach_id", coachId) // Extra seguridad: solo modificar si es suyo
        .select()
        .single();

      if (updateError) throw updateError;
      rawData = data;
    } else {
      // Crear nuevo alumno
      const { data, error: insertError } = await supabaseServer
        .from("coach_clientes")
        .insert([{
          coach_id: coachId,
          nombre,
          email: email || null,
          telefono: telefono || null,
          estado: estado || "activo",
          notas: notasJson
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      rawData = data;
    }

    // Retornar objeto enriquecido
    const result = {
      ...rawData,
      ...metadata,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error guardando alumno:", err);
    return NextResponse.json(
      { error: "Error interno del servidor", details: err.message },
      { status: 500 }
    );
  }
}
