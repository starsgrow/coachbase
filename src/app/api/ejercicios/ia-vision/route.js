import { supabaseServer } from "@/lib/supabaseServer";
import { authenticateApiRequest } from "@/lib/supabaseAuth";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    // Auth Guard
    const auth = await authenticateApiRequest(request);
    if (!auth || !auth.coach) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { imageMid, imageLast, duration } = await request.json();

    if (!imageMid) {
      return NextResponse.json(
        { error: "Se requiere al menos un fotograma del video para el análisis." },
        { status: 400 }
      );
    }

    const coach_id = auth.coach.id;

    // Prompt optimizado para visión y biomecánica
    const promptVision = `Analiza los fotogramas extraídos de este video demostrativo de fitness:
- Fotograma 1: Muestra al ejecutante en plena acción biomecánica del ejercicio.
${imageLast ? "- Fotograma 2: Muestra el fotograma final del video." : ""}

Identifica el ejercicio exacto, el equipamiento, la musculatura y la técnica.

REGLAS DE CLASIFICACIÓN:
1. Si el video muestra una Bicicleta Estática, Spinning, Cinta de Correr/Caminadora, Elíptica, Máquina de Remo, Salto de Cuerda o ejercicio aeróbico, el campo "grupo_muscular" DEBE SER EXACTAMENTE "Cardio" y el "equipamiento" la máquina correspondiente (ej: "Bicicleta Estática").
2. Para ejercicios de fuerza, usa uno de: Pecho | Espalda | Piernas | Hombros | Brazos | Abdomen | Full Body.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "nombre_ejercicio": "Nombre preciso del ejercicio en español (ej: Cardio en Bicicleta Estática)",
  "nombres_comunes": [
    "Nombre en inglés / traducción internacional (ej: Stationary Bike Cardio)",
    "Sinónimo popular o modismo de gimnasio (ej: Spinning)",
    "Nombre alternativo según máquina o variante"
  ],
  "grupo_muscular": "Cardio | Piernas | Pecho | Espalda | Hombros | Brazos | Abdomen | Full Body",
  "musculos_secundarios": ["Músculo secundario 1", "Músculo secundario 2"],
  "equipamiento": "Bicicleta Estática | Cinta de Correr | Elíptica | Mancuernas | Barra | Polea | Máquina | Peso Corporal | Banda de Resistencia | Kettlebell",
  "dificultad": ["Principiante", "Intermedio", "Avanzado"],
  "descripcion": "Instrucciones biomecánicas precisas sobre postura, agarre, cadencia o trayectoria.",
  "beneficios": ["Beneficio clave 1", "Beneficio clave 2", "Beneficio clave 3"],
  "errores_comunes": ["Error común 1", "Error común 2"],
  "tiene_logo_final": ${imageLast ? "true/false (true si el Fotograma 2 contiene un logotipo, marca de agua, texto o pantalla de cierre promocional)" : "false"}
}`;

    const userContent = [
      { type: "text", text: promptVision },
      {
        type: "image_url",
        image_url: {
          url: imageMid.startsWith("data:") ? imageMid : `data:image/jpeg;base64,${imageMid}`,
          detail: "low",
        },
      },
    ];

    if (imageLast) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: imageLast.startsWith("data:") ? imageLast : `data:image/jpeg;base64,${imageLast}`,
          detail: "low",
        },
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres un científico deportivo y entrenador de élite experto en biomecánica, análisis de movimiento y visión computacional. Respondes exclusivamente en formato JSON estructurado.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
      max_tokens: 650,
    });

    const responseContent = completion.choices[0]?.message?.content?.trim();
    const resultadoIA = JSON.parse(responseContent);

    const nombreLimpio = (resultadoIA.nombre_ejercicio || "").trim().toLowerCase();

    // Comprobar si ya existe en catálogo
    let existeDuplicado = false;
    let coincidenciaExacta = null;

    if (nombreLimpio) {
      const [globalesRes, coachRes] = await Promise.all([
        supabaseServer
          .from("tabla_ejercicios")
          .select("slug, nombre_ejercicio, musculos_principales, nombres_comunes")
          .ilike("nombre_ejercicio", `%${nombreLimpio}%`)
          .limit(5),
        supabaseServer
          .from("coach_ejercicios")
          .select("id, nombre, grupo_muscular")
          .eq("coach_id", coach_id)
          .ilike("nombre", `%${nombreLimpio}%`)
          .limit(5),
      ]);

      const globales = globalesRes.data || [];
      const coaches = coachRes.data || [];

      coincidenciaExacta =
        globales.find(
          (g) =>
            g.nombre_ejercicio?.toLowerCase() === nombreLimpio ||
            (Array.isArray(g.nombres_comunes) &&
              g.nombres_comunes.some((nc) => nc.toLowerCase() === nombreLimpio))
        ) || coaches.find((c) => c.nombre?.toLowerCase() === nombreLimpio);

      if (coincidenciaExacta) {
        existeDuplicado = true;
      }
    }

    let nombresComunesArray = [];
    if (Array.isArray(resultadoIA.nombres_comunes)) {
      nombresComunesArray = resultadoIA.nombres_comunes;
    } else if (typeof resultadoIA.nombres_comunes === "string" && resultadoIA.nombres_comunes.trim()) {
      nombresComunesArray = resultadoIA.nombres_comunes.split(",").map((s) => s.trim()).filter(Boolean);
    }

    let musculosSecundariosArray = [];
    if (Array.isArray(resultadoIA.musculos_secundarios)) {
      musculosSecundariosArray = resultadoIA.musculos_secundarios;
    } else if (typeof resultadoIA.musculos_secundarios === "string" && resultadoIA.musculos_secundarios.trim()) {
      musculosSecundariosArray = resultadoIA.musculos_secundarios.split(",").map((s) => s.trim()).filter(Boolean);
    }

    let beneficiosArray = [];
    if (Array.isArray(resultadoIA.beneficios)) {
      beneficiosArray = resultadoIA.beneficios;
    } else if (typeof resultadoIA.beneficios === "string" && resultadoIA.beneficios.trim()) {
      beneficiosArray = resultadoIA.beneficios.split(",").map((s) => s.trim()).filter(Boolean);
    }

    let erroresComunesArray = [];
    if (Array.isArray(resultadoIA.errores_comunes)) {
      erroresComunesArray = resultadoIA.errores_comunes;
    } else if (typeof resultadoIA.errores_comunes === "string" && resultadoIA.errores_comunes.trim()) {
      erroresComunesArray = resultadoIA.errores_comunes.split(",").map((s) => s.trim()).filter(Boolean);
    }

    // Normalizar dificultad a array de niveles (Principiante, Intermedio, Avanzado)
    let dificultadArray = ["Intermedio"];
    if (Array.isArray(resultadoIA.dificultad) && resultadoIA.dificultad.length > 0) {
      dificultadArray = resultadoIA.dificultad;
    } else if (Array.isArray(resultadoIA.nivel_recomendado) && resultadoIA.nivel_recomendado.length > 0) {
      dificultadArray = resultadoIA.nivel_recomendado;
    } else if (typeof resultadoIA.dificultad === "string" && resultadoIA.dificultad.trim()) {
      dificultadArray = resultadoIA.dificultad.split(",").map((s) => s.trim()).filter(Boolean);
    }

    // Normalizar Grupo Muscular
    let grupoMuscular = resultadoIA.grupo_muscular || "Cardio";
    const textoAnalisis = `${resultadoIA.nombre_ejercicio || ""} ${resultadoIA.equipamiento || ""} ${resultadoIA.descripcion || ""}`.toLowerCase();

    if (
      textoAnalisis.includes("bici") ||
      textoAnalisis.includes("bicicleta") ||
      textoAnalisis.includes("spinning") ||
      textoAnalisis.includes("cinta") ||
      textoAnalisis.includes("caminadora") ||
      textoAnalisis.includes("elíptica") ||
      textoAnalisis.includes("eliptica") ||
      textoAnalisis.includes("treadmill") ||
      textoAnalisis.includes("cardio") ||
      textoAnalisis.includes("remo") ||
      textoAnalisis.includes("salto de cuerda") ||
      textoAnalisis.includes("assault bike")
    ) {
      grupoMuscular = "Cardio";
      if (musculosSecundariosArray.length === 0) {
        musculosSecundariosArray = ["Cuádriceps", "Glúteos", "Gemelos", "Core"];
      }
      if (beneficiosArray.length === 0) {
        beneficiosArray = [
          "Mejora la capacidad cardiovascular y quema calórica",
          "Bajo impacto en articulaciones de rodilla y tobillo",
          "Acondicionamiento y resistencia aeróbica"
        ];
      }
      if (erroresComunesArray.length === 0) {
        erroresComunesArray = [
          "Ajuste inadecuado de la altura del sillín",
          "Encorvar la espalda baja o sobrecargar hombros",
          "Pedalear sin resistencia adecuada"
        ];
      }
    } else {
      const validGrupos = ["Pecho", "Espalda", "Piernas", "Hombros", "Brazos", "Abdomen", "Cardio", "Full Body"];
      const match = validGrupos.find(
        (g) => g.toLowerCase() === (resultadoIA.grupo_muscular || "").toLowerCase()
      );
      grupoMuscular = match || "Full Body";
    }

    return NextResponse.json({
      success: true,
      datos: {
        nombre_ejercicio: resultadoIA.nombre_ejercicio || "Ejercicio Personalizado",
        nombres_comunes: nombresComunesArray,
        grupo_muscular: grupoMuscular,
        musculos_secundarios: musculosSecundariosArray,
        equipamiento: resultadoIA.equipamiento || "General",
        dificultad: dificultadArray,
        descripcion: resultadoIA.descripcion || "",
        beneficios: beneficiosArray,
        errores_comunes: erroresComunesArray,
        tiene_logo_final: Boolean(resultadoIA.tiene_logo_final),
        duracion_segundos: duration || null,
      },
      existeDuplicado,
      coincidenciaExacta,
    });
  } catch (err) {
    console.error("Error en análisis de video con IA:", err);
    return NextResponse.json(
      { error: err.message || "Error al analizar el video con IA" },
      { status: 500 }
    );
  }
}
