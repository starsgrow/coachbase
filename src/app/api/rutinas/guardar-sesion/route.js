import { authenticateApiRequest } from "@/lib/supabaseAuth";
import { supabaseServer } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const auth = await authenticateApiRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado o sesión inválida" }, { status: 401 });
    }

    const body = await req.json();
    const {
      cliente_id,
      rutina_id,
      dia_idx = 0,
      sesion_log,
      actualizar_rutina = true,
      coach_id,
    } = body;

    if (!sesion_log || !rutina_id) {
      return NextResponse.json(
        { error: "Faltan datos requeridos (rutina_id, sesion_log)" },
        { status: 400 }
      );
    }

    // 1. Obtener la rutina actual
    const { data: rutinaActual, error: fetchErr } = await supabaseServer
      .from("coach_rutinas")
      .select("*")
      .eq("id", rutina_id)
      .single();

    if (fetchErr || !rutinaActual) {
      return NextResponse.json(
        { error: "No se encontró la rutina: " + (fetchErr?.message || "") },
        { status: 404 }
      );
    }

    const estructura = Array.isArray(rutinaActual.estructura_json)
      ? rutinaActual.estructura_json
      : rutinaActual.estructura_json?.dias || [];

    // 2. Guardar el log en el historial de la rutina
    const historialActual = rutinaActual.historial_sesiones || [];
    const nuevoHistorial = [sesion_log, ...historialActual.slice(0, 49)]; // Guardar las últimas 50 sesiones

    // 3. Si está activado actualizar_rutina, aplicar las nuevas metas de sobrecarga a los ejercicios
    let estructuraActualizada = estructura;
    if (actualizar_rutina && Array.isArray(sesion_log.ejercicios)) {
      estructuraActualizada = estructura.map((dia, dIdx) => {
        if (dIdx !== Number(dia_idx)) return dia;

        const ejerciciosActualizados = (dia.ejercicios || []).map((ej) => {
          const logEj = sesion_log.ejercicios.find(
            (e) => (e.ejercicio_id || e.nombre) === (ej.ejercicio_id || ej.nombre)
          );

          if (logEj && logEj.sobrecarga_proxima) {
            const next = logEj.sobrecarga_proxima;
            return {
              ...ej,
              peso_sugerido_kg: next.proximoPesoKg ?? ej.peso_sugerido_kg,
              repeticiones: next.proximasReps ?? ej.repeticiones,
              series: next.proximasSeries ?? ej.series,
              descanso_seg: next.proximoDescansoSeg ?? ej.descanso_seg,
              tempo: next.proximoTempo ?? ej.tempo,
              ultimo_registro: {
                fecha: sesion_log.fecha,
                series: logEj.series,
                sobrecarga_aplicada: next.mensaje,
                tonnage: logEj.tonnage,
              },
            };
          }
          return ej;
        });

        return { ...dia, ejercicios: ejerciciosActualizados };
      });
    }

    // 4. Actualizar en Supabase
    const { data: rutinaGuardada, error: updateErr } = await supabaseServer
      .from("coach_rutinas")
      .update({
        estructura_json: estructuraActualizada,
        historial_sesiones: nuevoHistorial,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rutina_id)
      .select()
      .single();

    if (updateErr) {
      // Si la columna historial_sesiones no existe en la tabla, guardamos dentro de estructura_json
      const estructuraConHistorial = {
        dias: estructuraActualizada,
        historial_sesiones: nuevoHistorial,
      };

      const { data: retryData, error: retryErr } = await supabaseServer
        .from("coach_rutinas")
        .update({
          estructura_json: estructuraConHistorial,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rutina_id)
        .select()
        .single();

      if (retryErr) {
        throw new Error(retryErr.message);
      }

      return NextResponse.json({
        success: true,
        mensaje: "Sesión registrada y metas de sobrecarga actualizadas con éxito.",
        rutina: retryData,
      });
    }

    return NextResponse.json({
      success: true,
      mensaje: "Sesión registrada y metas de sobrecarga actualizadas con éxito.",
      rutina: rutinaGuardada,
    });
  } catch (err) {
    console.error("Error al guardar sesión de entrenamiento:", err);
    return NextResponse.json(
      { error: "Error interno al guardar sesión: " + err.message },
      { status: 500 }
    );
  }
}
