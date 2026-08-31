import { supabaseServer } from "@/lib/supabaseServer";
import { authenticateApiRequest } from "@/lib/supabaseAuth";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request) {
  try {
    // Auth Guard: validar sesión del usuario
    const auth = await authenticateApiRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { nombre } = await request.json();

    // Usar el coach_id del usuario autenticado
    const coach_id = auth.coach.id;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: "El nombre del ejercicio es requerido" }, { status: 400 });
    }

    const nombreLimpio = nombre.trim().toLowerCase();

    // 1. Checar duplicados en Supabase (tabla_ejercicios y coach_ejercicios)
    const [globalesRes, coachRes] = await Promise.all([
      supabaseServer
        .from("tabla_ejercicios")
        .select("slug, nombre_ejercicio, musculos_principales, nombres_comunes")
        .ilike("nombre_ejercicio", `%${nombreLimpio}%`)
        .limit(10),
      supabaseServer
        .from("coach_ejercicios")
        .select("id, nombre, grupo_muscular")
        .eq("coach_id", coach_id)
        .ilike("nombre", `%${nombreLimpio}%`)
        .limit(10)
    ]);

    const coincidenciasGlobales = globalesRes.data || [];
    const coincidenciasCoach = coachRes.data || [];

    // Si hay una coincidencia exacta de nombre o en nombres_comunes, notificar duplicado
    const coincidenciaExacta = coincidenciasGlobales.find(
      (g) =>
        g.nombre_ejercicio?.toLowerCase() === nombreLimpio ||
        (Array.isArray(g.nombres_comunes) &&
          g.nombres_comunes.some((nc) => nc.toLowerCase() === nombreLimpio))
    ) || coincidenciasCoach.find(
      (c) => c.nombre?.toLowerCase() === nombreLimpio
    );

    if (coincidenciaExacta) {
      return NextResponse.json({
        success: true,
        existeDuplicado: true,
        ejercicioExistente: coincidenciaExacta,
        mensaje: `El ejercicio "${coincidenciaExacta.nombre_ejercicio || coincidenciaExacta.nombre}" ya existe en el catálogo.`
      });
    }

    // 2. Analizar con OpenAI si el nombre es ambiguo o específico
    const prompt = `Analiza el nombre de este ejercicio de gimnasio: "${nombre}".

Paso 1: Determina si el nombre es AMBIGUO o demasiado genérico (por ejemplo: "aductor", "press", "sentadilla", "remo", "curl").
Paso 2: 
- Si es AMBIGUO, devuelve "es_ambiguo": true y una lista de 4 a 6 variaciones/ejercicios específicos más comunes en "sugerencias".
- Si es ESPECÍFICO (por ejemplo: "Aductor acostado en máquina", "Press de banca plano con barra", "Sentadilla búlgara con mancuernas"), devuelve "es_ambiguo": false y la ficha técnica completa incluyendo "nombres_comunes".

Responde ÚNICAMENTE en JSON válido con este formato:

Si es ambiguo:
{
  "es_ambiguo": true,
  "sugerencias": ["Aductor acostado en máquina", "Adducción de cadera en polea baja", "Aductor sentado en máquina", "Aductor de pie con banda"]
}

Si es específico:
{
  "es_ambiguo": false,
  "nombre_ejercicio": "${nombre}",
  "nombres_comunes": [
    "Nombre en inglés / traducción internacional",
    "Sinónimo común o modismo en el gimnasio",
    "Nombre alternativo según equipamiento"
  ],
  "descripcion": "Instrucciones detalladas de ejecución con buena biomecánica.",
  "beneficios": ["Beneficio 1", "Beneficio 2", "Beneficio 3"],
  "errores_comunes": ["Error común 1", "Error común 2"],
  "precauciones": ["Precaución 1", "Precaución 2"],
  "tipo_ejercicio": "aislado | compuesto | cardio | funcional",
  "musculos_principales": "Músculo primario",
  "musculos_secundarios": ["Músculo secundario 1", "Músculo secundario 2"],
  "equipamiento_necesario": ["Máquina/Equipamiento exacto"],
  "nivel_recomendado": ["Principiante", "Intermedio"],
  "intensidad": "Media",
  "objetivos_principales": "hipertrofia",
  "ranking_efectividad": 8,
  "etiquetas": ["gimnasio", "grupo_muscular"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un científico deportivo y experto en biomecánica. Respondes exclusivamente en formato JSON estructurado."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0]?.message?.content;
    const resultadoIA = JSON.parse(responseContent);

    // Si la IA detecta ambigüedad, retornamos las sugerencias
    if (resultadoIA.es_ambiguo) {
      return NextResponse.json({
        success: true,
        esAmbiguo: true,
        sugerencias: resultadoIA.sugerencias || [],
        coincidenciasDB: [...coincidenciasGlobales, ...coincidenciasCoach]
      });
    }

    // Normalizar si es específico
    let nombresComunesArray = [];
    if (Array.isArray(resultadoIA.nombres_comunes)) {
      nombresComunesArray = resultadoIA.nombres_comunes;
    } else if (typeof resultadoIA.nombres_comunes === "string" && resultadoIA.nombres_comunes.trim()) {
      nombresComunesArray = resultadoIA.nombres_comunes.split(",").map((s) => s.trim()).filter(Boolean);
    }

    let dificultadArray = ["Intermedio"];
    if (Array.isArray(resultadoIA.nivel_recomendado) && resultadoIA.nivel_recomendado.length > 0) {
      dificultadArray = resultadoIA.nivel_recomendado;
    } else if (Array.isArray(resultadoIA.dificultad) && resultadoIA.dificultad.length > 0) {
      dificultadArray = resultadoIA.dificultad;
    } else if (typeof resultadoIA.dificultad === "string" && resultadoIA.dificultad.trim()) {
      dificultadArray = resultadoIA.dificultad.split(",").map((s) => s.trim()).filter(Boolean);
    }

    let grupoMuscular = resultadoIA.musculos_principales || "General";
    const textoComp = `${resultadoIA.nombre_ejercicio || ""} ${Array.isArray(resultadoIA.equipamiento_necesario) ? resultadoIA.equipamiento_necesario.join(" ") : ""}`.toLowerCase();

    if (
      textoComp.includes("bici") ||
      textoComp.includes("bicicleta") ||
      textoComp.includes("spinning") ||
      textoComp.includes("cinta") ||
      textoComp.includes("caminadora") ||
      textoComp.includes("elíptica") ||
      textoComp.includes("eliptica") ||
      textoComp.includes("cardio") ||
      textoComp.includes("remo")
    ) {
      grupoMuscular = "Cardio";
    }

    const datosNormalizados = {
      ...resultadoIA,
      nombres_comunes: nombresComunesArray,
      grupo_muscular: grupoMuscular,
      equipamiento: Array.isArray(resultadoIA.equipamiento_necesario)
        ? resultadoIA.equipamiento_necesario.join(", ")
        : resultadoIA.equipamiento_necesario || "General",
      dificultad: dificultadArray
    };

    return NextResponse.json({
      success: true,
      esAmbiguo: false,
      datos: datosNormalizados
    });
  } catch (err) {
    console.error("Error en desambiguación e IA:", err);
    return NextResponse.json(
      { error: err.message || "No se pudo procesar la solicitud con IA" },
      { status: 500 }
    );
  }
}
