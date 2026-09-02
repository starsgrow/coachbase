import { supabaseServer } from '@/lib/supabaseServer';
import { authenticateApiRequest } from '@/lib/supabaseAuth';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const DISTRIBUCIONES = {
  1: [{ nombre: "Full Body", musculos: "Pecho, espalda, pierna, hombro, core, brazos" }],
  2: [
    { nombre: "Upper Body", musculos: "Pecho, espalda, hombro, brazos" },
    { nombre: "Lower Body", musculos: "Cuádriceps, glúteos, femoral, core" }
  ],
  3: [
    { nombre: "Push", musculos: "Pecho, hombro, tríceps" },
    { nombre: "Pull", musculos: "Espalda, bíceps" },
    { nombre: "Pierna", musculos: "Cuádriceps, glúteos, femoral, core" }
  ],
  4: [
    { nombre: "Torso A", musculos: "Pecho, espalda, hombro, brazos" },
    { nombre: "Pierna A", musculos: "Cuádriceps, glúteos, femoral, core" },
    { nombre: "Torso B", musculos: "Pecho, espalda, hombro, brazos" },
    { nombre: "Pierna B", musculos: "Cuádriceps, glúteos, femoral, core" }
  ],
  5: [
    { nombre: "Pierna A", musculos: "Cuádriceps, glúteos, femoral" },
    { nombre: "Push", musculos: "Pecho, hombro, tríceps" },
    { nombre: "Pull", musculos: "Espalda, bíceps" },
    { nombre: "Pierna B", musculos: "Cuádriceps, glúteos, femoral" },
    { nombre: "Torso / Core", musculos: "General, brazos, zona media" }
  ],
  6: [
    { nombre: "Push A", musculos: "Pecho, hombro, tríceps" },
    { nombre: "Pull A", musculos: "Espalda, bíceps" },
    { nombre: "Pierna A", musculos: "Cuádriceps, glúteos, femoral" },
    { nombre: "Push B", musculos: "Pecho, hombro, tríceps" },
    { nombre: "Pull B", musculos: "Espalda, bíceps" },
    { nombre: "Pierna B", musculos: "Cuádriceps, glúteos, femoral" }
  ]
};

const SYSTEM_PROMPT_BASE = `Eres un científico deportivo y entrenador personal de élite de la plataforma Olympo. Tu tarea es estructurar rutinas de entrenamiento híbridas (Fuerza, Hipertrofia y Cardio) en formato JSON ESTRICTO.

REGLAS DE SALIDA:
1. Respondes ÚNICAMENTE con un array JSON válido, sin texto explicativo ni markdown alrededor.
2. Cada elemento del array representa un día de entrenamiento:
   - "dia": número entero (1, 2, 3...)
   - "nombre": nombre motivador del día (ej: "Día 1: Push & Cardio — Pecho, Hombro y Bici")
   - "ejercicios": array de objetos de ejercicio:

   A) Para Ejercicios de FUERZA / MUSCULACIÓN:
      - "tipo_ejercicio": "fuerza"
      - "slug": slug exacto del ejercicio recibido del catálogo
      - "nombre": nombre visible del ejercicio
      - "series": número entero (3 a 4)
      - "repeticiones": array de enteros por serie (ej: [12, 10, 10, 8])
      - "porcentaje_peso": array de enteros (50 a 85, SOLO números)
      - "descanso_seg": entero de segundos de descanso (60, 90, 120)
      - "notas": breve recomendación biomecánica o técnica de intensidad (Biserie, Lento, Explosivo, etc.). NUNCA repitas el número de series o repeticiones aquí.

   B) Para Ejercicios de CARDIO / AERÓBICO (Bicicleta Estática, Cinta de Correr, Elíptica, Remo, Salto de Cuerda):
      - "tipo_ejercicio": "cardio"
      - "slug": slug exacto del ejercicio de cardio del catálogo
      - "nombre": nombre visible del ejercicio
      - "duracion_minutos": entero de minutos (ej: 15, 20, 30)
      - "modalidad": "LISS" | "HIIT" | "Zona 2" | "Calentamiento" | "Sprint"
      - "resistencia_rpm": nivel de carga o cadencia sugerida (ej: "Nivel 6 / 80 RPM", "Inclinación 4% / 6.0 km/h")
      - "notas_cadencia": instrucción de ritmo cardíaco o respiración (ej: "Mantener zona aeróbica constante sin agotamiento excesivo.")

REGLA DE PRIORIDAD:
- SIEMPRE da máxima prioridad a los ejercicios con etiqueta [DEL COACH] disponibles en el catálogo.
- Usa únicamente los slugs y nombres provistos en el catálogo.`;

export async function POST(request) {
  try {
    // Auth Guard: validar sesión del usuario
    const auth = await authenticateApiRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { tipo, comando, objetivo, nivel, dias_semana, lesiones } = body;

    // Usar el coach_id del usuario autenticado
    const coach_id = auth.coach.id;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Falta OPENAI_API_KEY" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY.trim() });

    // 1. Obtener catálogo unificado de ejercicios (priorizando los propios del coach)
    const [globalesRes, coachRes] = await Promise.all([
      supabaseServer.from("tabla_ejercicios").select("id, slug, nombre_ejercicio, musculos_principales, equipamiento_necesario, preview_url_webp"),
      supabaseServer.from("coach_ejercicios").select("id, slug, nombre, grupo_muscular, equipamiento, thumbnail_url, video_demo_url").eq("coach_id", coach_id)
    ]);

    const listaEjerciciosCoach = (coachRes.data || []).map(e => ({
      id: e.id,
      slug: e.slug,
      nombre: `[DEL COACH] ${e.nombre}`,
      nombre_real: e.nombre,
      grupo_muscular: e.grupo_muscular || "General",
      thumbnail_url: e.thumbnail_url,
      video_demo_url: e.video_demo_url,
      es_cardio: (e.grupo_muscular || "").toLowerCase() === "cardio" || (e.nombre || "").toLowerCase().includes("bici") || (e.nombre || "").toLowerCase().includes("cinta")
    }));

    const listaEjerciciosGlobales = (globalesRes.data || []).map(g => ({
      id: g.id,
      slug: g.slug,
      nombre: g.nombre_ejercicio || g.nombre,
      nombre_real: g.nombre_ejercicio || g.nombre,
      grupo_muscular: Array.isArray(g.musculos_principales) ? g.musculos_principales.join(", ") : (g.musculos_principales || "General"),
      thumbnail_url: g.preview_url_webp,
      video_demo_url: null,
      es_cardio: (g.musculos_principales || "").toString().toLowerCase().includes("cardio")
    }));

    const listaEjercicios = [...listaEjerciciosCoach, ...listaEjerciciosGlobales];

    if (tipo === "voz") {
      if (!comando || !comando.trim()) {
        return NextResponse.json({ error: "No se recibió el texto de la grabación de voz" }, { status: 400 });
      }

      const promptVoz = `El coach ha dictado las siguientes instrucciones de entrenamiento:
"${comando}"

${lesiones ? `ADVERTENCIA DE LESIONES DEL ALUMNO: ${lesiones} (Evita ejercicios que comprometan estas zonas)` : ""}

Catálogo de ejercicios disponibles (Prioriza los marcados con [DEL COACH]):
${JSON.stringify(listaEjercicios, null, 2)}

Interpreta el dictado y genera la rutina estructurada respetando si un ejercicio es de FUERZA o de CARDIO según las reglas del sistema.
Devuelve ÚNICAMENTE el array JSON puro.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT_BASE },
          { role: "user", content: promptVoz }
        ],
        temperature: 0.2,
      });

      let text = response.choices[0].message.content.trim();
      text = text.replace(/```json|```/g, "").trim();

      const rutinaEstructurada = JSON.parse(text);

      // Limpiar prefijos [DEL COACH] en los nombres devueltos y mapear medios
      const hidratarEjercicio = (ej) => {
        const dbRef = listaEjercicios.find(item => item.slug === ej.slug) || {};
        return {
          ...ej,
          ejercicio_id: dbRef.id || null,
          nombre: (ej.nombre || "").replace("[DEL COACH]", "").trim(),
          thumbnail_url: dbRef.thumbnail_url || null,
          video_demo_url: dbRef.video_demo_url || null
        };
      };

      const rutinaLimpia = rutinaEstructurada.map(dia => ({
        ...dia,
        ejercicios: (dia.ejercicios || []).map(hidratarEjercicio)
      }));

      return NextResponse.json({ success: true, rutina: rutinaLimpia });
    }

    if (tipo === "ia-automatica") {
      const numDias = Math.min(Math.max(parseInt(dias_semana) || 4, 1), 6);
      const distribucion = DISTRIBUCIONES[numDias] || DISTRIBUCIONES[4];

      const promptAuto = `Diseña una rutina completa y equilibrada para:
- Objetivo: ${objetivo || "Hipertrofia"}
- Nivel: ${nivel || "Intermedio"}
- Días por semana: ${numDias}
${lesiones ? `- Lesiones/Limitaciones a evitar: ${lesiones}` : ""}

Distribución recomendada por días:
${distribucion.map((d, i) => `Día ${i + 1}: ${d.nombre} (${d.musculos})`).join("\n")}

Catálogo de ejercicios disponibles (Usa preferentemente los ejercicios del coach marcados con [DEL COACH]):
${JSON.stringify(listaEjercicios, null, 2)}

Genera una rutina de ${numDias} días estructurada, con 4-5 ejercicios de fuerza por día y, si corresponde según el objetivo (${objetivo}), incluye un bloque de Cardio al final o inicio.
Devuelve ÚNICAMENTE el array JSON puro.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT_BASE },
          { role: "user", content: promptAuto }
        ],
        temperature: 0.3,
      });

      let text = response.choices[0].message.content.trim();
      text = text.replace(/```json|```/g, "").trim();

      const rutinaEstructurada = JSON.parse(text);

      const hidratarEjercicio = (ej) => {
        const dbRef = listaEjercicios.find(item => item.slug === ej.slug) || {};
        return {
          ...ej,
          ejercicio_id: dbRef.id || null,
          nombre: (ej.nombre || "").replace("[DEL COACH]", "").trim(),
          thumbnail_url: dbRef.thumbnail_url || null,
          video_demo_url: dbRef.video_demo_url || null
        };
      };

      const rutinaLimpia = rutinaEstructurada.map(dia => ({
        ...dia,
        ejercicios: (dia.ejercicios || []).map(hidratarEjercicio)
      }));

      return NextResponse.json({ success: true, rutina: rutinaLimpia });
    }

    if (tipo === "voz-modificar") {
      if (!comando || !comando.trim()) {
        return NextResponse.json({ error: "No se recibió el texto de la grabación de voz" }, { status: 400 });
      }

      const promptModificar = `El coach ha dictado una instrucción para modificar un día de entrenamiento específico:
"${comando}"

ESTADO ACTUAL DEL DÍA:
${JSON.stringify(body.dia_actual, null, 2)}

Catálogo de ejercicios disponibles (Prioriza los marcados con [DEL COACH]):
${JSON.stringify(listaEjercicios, null, 2)}

Tu tarea es aplicar los cambios solicitados por el coach al "ESTADO ACTUAL DEL DÍA" y devolver el día actualizado.
Debes devolver ÚNICAMENTE un array JSON que contenga un solo objeto correspondiente a ese día modificado, siguiendo las mismas reglas estructurales (día, nombre, ejercicios).`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT_BASE },
          { role: "user", content: promptModificar }
        ],
        temperature: 0.2,
      });

      let text = response.choices[0].message.content.trim();
      text = text.replace(/```json|```/g, "").trim();

      const rutinaEstructurada = JSON.parse(text);

      const hidratarEjercicio = (ej) => {
        const dbRef = listaEjercicios.find(item => item.slug === ej.slug) || {};
        return {
          ...ej,
          ejercicio_id: dbRef.id || null,
          nombre: (ej.nombre || "").replace("[DEL COACH]", "").trim(),
          thumbnail_url: dbRef.thumbnail_url || null,
          video_demo_url: dbRef.video_demo_url || null
        };
      };

      const rutinaLimpia = rutinaEstructurada.map(dia => ({
        ...dia,
        ejercicios: (dia.ejercicios || []).map(hidratarEjercicio)
      }));

      return NextResponse.json({ success: true, rutina: rutinaLimpia });
    }

    if (tipo === "voz-modificar-ejercicio") {
      if (!comando || !comando.trim()) {
        return NextResponse.json({ error: "No se recibió el texto de la grabación de voz" }, { status: 400 });
      }

      const promptModificarEjercicio = `El coach ha dictado una instrucción para modificar un ejercicio específico:
"${comando}"

ESTADO ACTUAL DEL EJERCICIO:
${JSON.stringify(body.ejercicio_actual, null, 2)}

Catálogo de ejercicios disponibles (Prioriza los marcados con [DEL COACH]):
${JSON.stringify(listaEjercicios, null, 2)}

Tu tarea es aplicar los cambios solicitados por el coach al "ESTADO ACTUAL DEL EJERCICIO" y devolver el ejercicio actualizado.
Debes devolver ÚNICAMENTE un objeto JSON correspondiente a ese ejercicio modificado. No devuelvas un array, solo el objeto JSON puro.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT_BASE },
          { role: "user", content: promptModificarEjercicio }
        ],
        temperature: 0.2,
      });

      let text = response.choices[0].message.content.trim();
      text = text.replace(/```json|```/g, "").trim();

      let ejercicioModificado = JSON.parse(text);
      const dbRef = listaEjercicios.find(item => item.slug === ejercicioModificado.slug) || {};
      
      ejercicioModificado = {
        ...ejercicioModificado,
        ejercicio_id: dbRef.id || null,
        nombre: (ejercicioModificado.nombre || "").replace("[DEL COACH]", "").trim(),
        thumbnail_url: dbRef.thumbnail_url || null,
        video_demo_url: dbRef.video_demo_url || null
      };

      return NextResponse.json({ success: true, ejercicio: ejercicioModificado });
    }

    return NextResponse.json({ error: "Tipo de generación no válido" }, { status: 400 });
  } catch (err) {
    console.error("Error en generar-ia:", err);
    return NextResponse.json({ error: err.message || "Error al procesar rutina con IA" }, { status: 500 });
  }
}
