import { getCoachBySlug, getCoachClientes } from "@/lib/coachUtils";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  Apple,
  Flame,
  Scale,
  Utensils,
  Clock,
  CheckCircle2,
  Droplets,
  Heart,
  Sparkles,
  Info
} from "lucide-react";
import BotonDescargaDietaPDF from "@/components/BotonDescargaDietaPDF";

export default async function StudentNutricionPage({ params }) {
  const { tenant } = await params;
  const coach = await getCoachBySlug(tenant);

  let planActivo = null;

  if (coach) {
    // Buscar el primer plan activo del coach o plan destacado
    try {
      const { data } = await supabaseServer
        .from("coach_planes_alimentacion")
        .select("*")
        .eq("coach_id", coach.id)
        .eq("activo", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      planActivo = data;
    } catch (e) {
      planActivo = null;
    }

    if (!planActivo) {
      // Buscar en los clientes del coach
      const clientes = await getCoachClientes(coach.id);
      for (const cl of clientes) {
        if (cl.notas && typeof cl.notas === "string" && cl.notas.includes("plan_alimentacion_activo")) {
          try {
            const extra = JSON.parse(cl.notas);
            if (extra.plan_alimentacion_activo) {
              planActivo = extra.plan_alimentacion_activo;
              break;
            }
          } catch (err) {}
        }
      }
    }
  }

  // Si aún no hay plan creado, mostrar un plan demo saludable diseñado por el coach
  if (!planActivo) {
    planActivo = {
      titulo: "Plan Nutricional de Alto Rendimiento",
      descripcion: "Estructura balanceada para optimizar energía, recuperación muscular y control de composición corporal.",
      calorias_totales: 2350,
      proteinas_g: 160,
      carbohidratos_g: 270,
      grasas_g: 65,
      recomendaciones: [
        "Beber de 3 a 3.5 litros de agua al día para mantener una hidratación celular óptima.",
        "Consumir la comida pre-entrenamiento al menos 60-90 minutos antes de la sesión.",
        "Ajustar sal y especias naturales al gusto sin exceso de salsas ultraprocesadas."
      ],
      comidas: [
        {
          nombre: "Desayuno Energético",
          hora_sugerida: "08:00 AM",
          macros: { kcal: 580, proteina: 38, carbohidratos: 68, grasa: 16 },
          ingredientes: [
            { nombre: "Huevo entero", unidad_texto: "3 unidades (150g)", macros: { kcal: 215, proteina: 19, carbohidratos: 1, grasa: 15 } },
            { nombre: "Avena en hojuelas", unidad_texto: "60 g", macros: { kcal: 233, proteina: 10, carbohidratos: 40, grasa: 4 } },
            { nombre: "Banano / Plátano maduro", unidad_texto: "1 unidad (100g)", macros: { kcal: 89, proteina: 1, carbohidratos: 23, grasa: 0 } },
            { nombre: "Fresas frescas", unidad_texto: "80 g", macros: { kcal: 26, proteina: 1, carbohidratos: 6, grasa: 0 } }
          ]
        },
        {
          nombre: "Almuerzo Anabólico",
          hora_sugerida: "01:00 PM",
          macros: { kcal: 720, proteina: 52, carbohidratos: 85, grasa: 18 },
          ingredientes: [
            { nombre: "Pechuga de pollo a la plancha", unidad_texto: "180 g", macros: { kcal: 297, proteina: 56, carbohidratos: 0, grasa: 6 } },
            { nombre: "Arroz blanco cocido", unidad_texto: "220 g", macros: { kcal: 286, proteina: 6, carbohidratos: 62, grasa: 1 } },
            { nombre: "Aguacate / Palta", unidad_texto: "60 g", macros: { kcal: 96, proteina: 1, carbohidratos: 5, grasa: 9 } },
            { nombre: "Ensalada verde con tomate", unidad_texto: "120 g", macros: { kcal: 25, proteina: 1, carbohidratos: 4, grasa: 0 } }
          ]
        },
        {
          nombre: "Merienda Pre-Entreno",
          hora_sugerida: "05:00 PM",
          macros: { kcal: 430, proteina: 32, carbohidratos: 52, grasa: 10 },
          ingredientes: [
            { nombre: "Yogur griego natural sin azúcar", unidad_texto: "200 g", macros: { kcal: 118, proteina: 20, carbohidratos: 7, grasa: 1 } },
            { nombre: "Proteína Whey en polvo", unidad_texto: "25 g", macros: { kcal: 98, proteina: 20, carbohidratos: 2, grasa: 1 } },
            { nombre: "Arándanos / Frutos rojos", unidad_texto: "80 g", macros: { kcal: 46, proteina: 1, carbohidratos: 12, grasa: 0 } },
            { nombre: "Almendras tostadas", unidad_texto: "20 g", macros: { kcal: 116, proteina: 4, carbohidratos: 4, grasa: 10 } }
          ]
        },
        {
          nombre: "Cena Reparadora",
          hora_sugerida: "08:30 PM",
          macros: { kcal: 540, proteina: 42, carbohidratos: 55, grasa: 17 },
          ingredientes: [
            { nombre: "Filete de salmón / Tilapia", unidad_texto: "160 g", macros: { kcal: 332, proteina: 34, carbohidratos: 0, grasa: 20 } },
            { nombre: "Papa / Patata al vapor o cocida", unidad_texto: "200 g", macros: { kcal: 174, proteina: 4, carbohidratos: 40, grasa: 0 } },
            { nombre: "Brócoli y espárragos al vapor", unidad_texto: "150 g", macros: { kcal: 51, proteina: 4, carbohidratos: 10, grasa: 1 } }
          ]
        }
      ]
    };
  }

  const nombreCoach = coach?.nombre_marca || `Coach ${tenant}`;
  const totalKcal = planActivo.calorias_totales || planActivo.totales?.kcal || planActivo.totales_calculados?.kcal || 2350;
  const prot = planActivo.proteinas_g || planActivo.totales?.proteinas || planActivo.totales_calculados?.proteinas || 160;
  const carbs = planActivo.carbohidratos_g || planActivo.totales?.carbohidratos || planActivo.totales_calculados?.carbohidratos || 270;
  const grasa = planActivo.grasas_g || planActivo.totales?.grasas || planActivo.totales_calculados?.grasas || 65;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner de Nutrición */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 p-6 md:p-10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-2xl">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white mb-3 shadow"
            style={{ backgroundColor: "var(--color-primary, #10B981)" }}
          >
            <Apple className="w-3.5 h-3.5" /> Plan Nutricional • {nombreCoach}
          </span>
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
            {planActivo.titulo}
          </h1>
          <p className="mt-2 text-slate-300 text-xs md:text-sm">
            {planActivo.descripcion ||
              "Tu plan de comidas diario con porciones calculadas con precisión para alcanzar tus objetivos físicos."}
          </p>
        </div>

        <div className="relative z-10 flex items-center">
          <BotonDescargaDietaPDF
            plan={planActivo}
            coachNombre={nombreCoach}
            coachTenant={tenant}
            coachLogo={coach?.logo_url || null}
            coachColorPrimario={coach?.color_primario || "#10B981"}
            className="w-full sm:w-auto"
          />
        </div>
      </section>

      {/* Tarjetas de Metas Diarias */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" /> Calorías Objetivo
          </span>
          <div className="text-2xl font-black text-white mt-1">
            {totalKcal} <span className="text-xs font-normal text-slate-400">kcal/día</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] font-bold text-emerald-400 uppercase flex items-center gap-1">
            🥩 Proteína
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {prot} <span className="text-xs font-normal text-slate-400">g</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] font-bold text-sky-400 uppercase flex items-center gap-1">
            🍚 Carbohidratos
          </span>
          <div className="text-2xl font-black text-sky-400 mt-1">
            {carbs} <span className="text-xs font-normal text-slate-400">g</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] font-bold text-amber-400 uppercase flex items-center gap-1">
            🥑 Grasas
          </span>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {grasa} <span className="text-xs font-normal text-slate-400">g</span>
          </div>
        </div>
      </div>

      {/* Desglose de Comidas del Día */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Utensils className="w-5 h-5 text-emerald-400" /> Comidas del Día
        </h2>

        {(planActivo.comidas || []).map((comida, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl font-black text-xs text-white flex items-center justify-center shadow"
                  style={{ backgroundColor: "var(--color-primary, #10B981)" }}
                >
                  {idx + 1}
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">{comida.nombre}</h3>
                  {comida.hora_sugerida && (
                    <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-500" /> {comida.hora_sugerida}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 font-mono">
                <span className="text-white font-bold">{comida.macros?.kcal} kcal</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">{comida.macros?.proteina}g P</span>
                <span>•</span>
                <span className="text-sky-400 font-bold">{comida.macros?.carbohidratos}g C</span>
                <span>•</span>
                <span className="text-amber-400 font-bold">{comida.macros?.grasa}g G</span>
              </div>
            </div>

            {/* Ingredientes de la Comida */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(comida.ingredientes || []).map((ing, iIdx) => (
                <div
                  key={iIdx}
                  className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3.5 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-slate-100 text-xs leading-snug">{ing.nombre}</span>
                    <span
                      className="text-white font-black text-[11px] px-2 py-0.5 rounded-lg shadow-sm whitespace-nowrap"
                      style={{ backgroundColor: "var(--color-primary, #10B981)" }}
                    >
                      {ing.unidad_texto || `${ing.cantidad}g`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-900 font-mono">
                    <span>{ing.macros?.kcal} kcal</span>
                    <span className="text-emerald-400">{ing.macros?.proteina}g P</span>
                    <span className="text-sky-400">{ing.macros?.carbohidratos}g C</span>
                    <span className="text-amber-400">{ing.macros?.grasa}g G</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Consejos y Recomendaciones del Coach */}
      {planActivo.recomendaciones && planActivo.recomendaciones.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Consejos y Recomendaciones de {nombreCoach}
          </h3>
          <ul className="space-y-2 text-xs md:text-sm text-slate-300">
            {planActivo.recomendaciones.map((rec, rIdx) => (
              <li key={rIdx} className="flex items-start gap-2.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
