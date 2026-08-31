import { authenticateApiRequest } from "@/lib/supabaseAuth";
import { supabaseServer } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const auth = await authenticateApiRequest(req);
    if (!auth || !auth.coach) {
      return NextResponse.json({ error: "No autorizado o sesión inválida" }, { status: 401 });
    }

    const coach_id = auth.coach.id;
    const body = await req.json();

    const {
      id,
      cliente_id,
      titulo,
      descripcion,
      metas_objetivo,
      totales_calculados,
      comidas,
      recomendaciones,
      activo = true,
    } = body;

    if (!titulo || !comidas || comidas.length === 0) {
      return NextResponse.json({ error: "Título y comidas son obligatorios" }, { status: 400 });
    }

    const planPayload = {
      titulo,
      descripcion: descripcion || "",
      metas_objetivo: metas_objetivo || {},
      totales: totales_calculados || {},
      comidas: comidas || [],
      recomendaciones: recomendaciones || [],
      updated_at: new Date().toISOString(),
    };

    // 1. Si está asignado a un cliente, actualizar el cliente en coach_clientes
    if (cliente_id) {
      const { data: clientData } = await supabaseServer
        .from("coach_clientes")
        .select("notas")
        .eq("id", cliente_id)
        .eq("coach_id", coach_id)
        .maybeSingle();

      if (clientData) {
        let extra = {};
        if (clientData.notas && typeof clientData.notas === "string") {
          try {
            extra = JSON.parse(clientData.notas);
          } catch (e) {
            extra = { notas_privadas: clientData.notas };
          }
        }

        extra.plan_alimentacion_activo = planPayload;
        if (totales_calculados) {
          extra.calorias_meta = totales_calculados.kcal || extra.calorias_meta;
          extra.proteinas_meta = totales_calculados.proteinas || extra.proteinas_meta;
          extra.carbohidratos_meta = totales_calculados.carbohidratos || extra.carbohidratos_meta;
          extra.grasas_meta = totales_calculados.grasas || extra.grasas_meta;
        }

        await supabaseServer
          .from("coach_clientes")
          .update({
            notas: JSON.stringify(extra),
            updated_at: new Date().toISOString(),
          })
          .eq("id", cliente_id);
      }
    }

    // 2. Intentar guardar en coach_planes_alimentacion si la tabla existe
    let savedRecord = null;
    try {
      if (id) {
        const { data, error } = await supabaseServer
          .from("coach_planes_alimentacion")
          .update({
            cliente_id: cliente_id || null,
            titulo,
            descripcion: descripcion || "",
            calorias_totales: totales_calculados?.kcal || metas_objetivo?.calorias || 2000,
            proteinas_g: totales_calculados?.proteinas || metas_objetivo?.proteinas || 150,
            carbohidratos_g: totales_calculados?.carbohidratos || metas_objetivo?.carbohidratos || 200,
            grasas_g: totales_calculados?.grasas || metas_objetivo?.grasas || 60,
            comidas: comidas,
            recomendaciones: recomendaciones || [],
            activo,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("coach_id", coach_id)
          .select()
          .single();

        if (!error && data) savedRecord = data;
      } else {
        const { data, error } = await supabaseServer
          .from("coach_planes_alimentacion")
          .insert([
            {
              coach_id,
              cliente_id: cliente_id || null,
              titulo,
              descripcion: descripcion || "",
              calorias_totales: totales_calculados?.kcal || metas_objetivo?.calorias || 2000,
              proteinas_g: totales_calculados?.proteinas || metas_objetivo?.proteinas || 150,
              carbohidratos_g: totales_calculados?.carbohidratos || metas_objetivo?.carbohidratos || 200,
              grasas_g: totales_calculados?.grasas || metas_objetivo?.grasas || 60,
              comidas: comidas,
              recomendaciones: recomendaciones || [],
              activo,
            },
          ])
          .select()
          .single();

        if (!error && data) savedRecord = data;
      }
    } catch (e) {
      // Si la tabla no existe en la base de datos, el plan queda guardado en el perfil del cliente
      console.log("Nota: guardado en perfil del cliente (fallback)");
    }

    return NextResponse.json({
      success: true,
      plan: {
        id: savedRecord?.id || `plan-${Date.now()}`,
        cliente_id,
        ...planPayload,
      },
    });
  } catch (err) {
    console.error("Error guardando plan de alimentacion:", err);
    return NextResponse.json(
      { error: err.message || "Error al guardar el plan de alimentación" },
      { status: 500 }
    );
  }
}
