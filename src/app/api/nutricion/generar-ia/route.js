import { authenticateApiRequest } from "@/lib/supabaseAuth";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { optimizarPlanNutricional, calcularMetasTDEE } from "@/lib/nutricionOptimizer";

export const maxDuration = 60;

// Cargar la base de datos de alimentos
const alimentosPath = path.join(process.cwd(), "src", "lib", "alimentos.json");
const alimentosDB = JSON.parse(fs.readFileSync(alimentosPath, "utf8"));
const alimentosMap = new Map(alimentosDB.map((a) => [a.id, a]));

export async function POST(req) {
  try {
    const auth = await authenticateApiRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado o sesión inválida" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Falta configurar OPENAI_API_KEY" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY.trim() });
    const body = await req.json();

    const {
      objetivo = "Hipertrofia",
      numero_comidas = 4,
      preferencias = "",
      alergias_exclusiones = "",
      comando_voz = "",
      metas_manuales = null,
      perfil_alumno = null,
    } = body;

    // 1. Determinar macros objetivo (manuales o calculados por TDEE)
    let targetMacros;
    if (metas_manuales && metas_manuales.calorias > 0) {
      targetMacros = {
        calorias: parseInt(metas_manuales.calorias),
        proteinas: parseInt(metas_manuales.proteinas) || Math.round(metas_manuales.calorias * 0.25 / 4),
        carbohidratos: parseInt(metas_manuales.carbohidratos) || Math.round(metas_manuales.calorias * 0.5 / 4),
        grasas: parseInt(metas_manuales.grasas) || Math.round(metas_manuales.calorias * 0.25 / 9),
      };
    } else if (perfil_alumno) {
      targetMacros = calcularMetasTDEE({
        peso_kg: perfil_alumno.peso_kg || 72,
        altura_cm: perfil_alumno.altura_cm || 175,
        edad: perfil_alumno.edad || 26,
        genero: perfil_alumno.genero || "masculino",
        nivel_actividad: perfil_alumno.nivel_actividad || "moderado",
        objetivo: objetivo,
        porcentaje_grasa: perfil_alumno.grasa_corporal || null,
      });
    } else {
      targetMacros = {
        calorias: 2400,
        proteinas: 160,
        carbohidratos: 280,
        grasas: 65,
      };
    }

    const numComidas = Math.min(Math.max(parseInt(numero_comidas) || 4, 2), 6);

    // 2. Preparar resumen conciso del catálogo de alimentos para la IA
    const catalogoAlimentos = alimentosDB.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      categoria: a.categoria,
      unidad: a.unidad,
      kcal_100: a.kcal_por_100,
      p: a.prot_por_100,
      c: a.carbs_por_100,
      g: a.grasa_por_100,
    }));

    const systemPrompt = `Eres un nutricionista deportivo de élite experto en composición corporal y dietética aplicada.
Tu misión es estructurar un plan de alimentación diario delicioso, realista y variado para un atleta, seleccionando ÚNICAMENTE ingredientes del catálogo provisto.

REGLAS CRÍTICAS:
1. Responde ÚNICAMENTE con un objeto JSON válido, sin markdown ni explicaciones adicionales.
2. Usa exactamente ${numComidas} comidas (ej: Desayuno, Almuerzo, Merienda / Pre-Entreno, Cena).
3. Cada ingrediente DEBE tener el "id" exacto correspondiente del catálogo de alimentos.
4. Indica una cantidad estimada en gramos o ml (el sistema optimizará matemáticamente los gramos exactos después).

Estructura JSON requerida:
{
  "titulo_plan": "Nombre descriptivo del plan (ej: Plan Hipertrofia Limpia — 4 Comidas)",
  "descripcion": "Breve explicación nutricional y enfoque del plan",
  "recomendaciones": [
    "Recomendación de hidratación (ej: Beber al menos 3 a 3.5 litros de agua al día)",
    "Consejo de timing de nutrientes (ej: Consumir la comida 3 entre 60 y 90 minutos antes de entrenar)",
    "Tip de digestión y suplementación básica"
  ],
  "comidas": [
    {
      "nombre": "Desayuno Energético",
      "hora_sugerida": "08:00 AM",
      "ingredientes": [
        { "id": "huevo_entero", "nombre": "Huevo entero", "cantidad": 150 },
        { "id": "avena_hojuelas", "nombre": "Avena en hojuelas", "cantidad": 60 },
        { "id": "platano_banano", "nombre": "Banano / Plátano", "cantidad": 100 }
      ]
    }
  ]
}`;

    const userPrompt = `Parámetros del Atleta:
- Objetivo: ${objetivo}
- Calorías Objetivo: ${targetMacros.calorias} kcal
- Proteínas: ${targetMacros.proteinas}g | Carbohidratos: ${targetMacros.carbohidratos}g | Grasas: ${targetMacros.grasas}g
- Número de Comidas: ${numComidas}
${preferencias ? `- Preferencias del Coach/Alumno: ${preferencias}` : ""}
${alergias_exclusiones ? `- Exclusiones / Alergias: ${alergias_exclusiones}` : ""}
${comando_voz ? `- Instrucciones Dictadas por Voz del Coach: "${comando_voz}"` : ""}

Catálogo de Alimentos Disponibles (usa estos IDs exactos):
${JSON.stringify(catalogoAlimentos, null, 2)}

Selecciona combinaciones de alimentos equilibradas y agradables para cada una de las ${numComidas} comidas. Devuelve SOLO el JSON puro.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const rawResponse = completion.choices[0]?.message?.content?.trim();
    const planIA = JSON.parse(rawResponse);

    // 3. Ejecutar el Auto-Balancer Determinista
    const resultadoOptimizado = optimizarPlanNutricional(planIA.comidas, targetMacros, alimentosMap);

    if (!resultadoOptimizado) {
      throw new Error("No se pudieron optimizar los macronutrientes del plan generado.");
    }

    const planFinal = {
      titulo: planIA.titulo_plan || `Plan Nutricional ${objetivo}`,
      descripcion: planIA.descripcion || "",
      recomendaciones: planIA.recomendaciones || [
        "Mantener una hidratación adecuada (35-40 ml por kg de peso corporal).",
        "Ajustar sal y condimentos al gusto sin excesos.",
        "Priorizar alimentos enteros y descanso nocturno de 7-8 horas.",
      ],
      metas_objetivo: targetMacros,
      totales_calculados: resultadoOptimizado.totales,
      diferencia: resultadoOptimizado.diferencia,
      comidas: resultadoOptimizado.comidas,
    };

    return NextResponse.json({
      success: true,
      plan: planFinal,
    });
  } catch (err) {
    console.error("Error en generar-ia de nutricion:", err);
    return NextResponse.json(
      { error: err.message || "Error generando el plan nutricional con IA" },
      { status: 500 }
    );
  }
}
