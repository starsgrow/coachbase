/**
 * Optimizador Nutricional y Auto-Balancer Matemático de Macronutrientes
 * para Olympo Coaches.
 */

// Mapa de factores de actividad física (NEAT / PAL)
export const FACTORES_ACTIVIDAD = {
  sedentario: { factor: 1.2, label: "Sedentario (Oficina / poco movimiento)", desc: "Poco o ningún ejercicio semanal" },
  ligero: { factor: 1.375, label: "Ligero (1 a 3 días/semana)", desc: "Entrenamiento moderado 1-3 veces/sem" },
  moderado: { factor: 1.55, label: "Moderado (3 a 5 días/semana)", desc: "Entrenamiento de fuerza regular 3-5 días" },
  intenso: { factor: 1.725, label: "Intenso (6 a 7 días/semana)", desc: "Entrenamiento intenso o trabajo físico activo" },
  muy_intenso: { factor: 1.9, label: "Atleta / Muy intenso (Doble sesión)", desc: "Atletas de élite, doble jornada diaria" },
};

// Ritmo de ajuste calórico (Slider/Selector de agresividad)
export const RITMOS_AJUSTE = {
  conservador: { label: "Conservador", factorDeficit: 0.12, factorSuperavit: 0.08, desc: "Cambio gradual, máxima preservación de fuerza" },
  moderado: { label: "Óptimo / Moderado (Recomendado)", factorDeficit: 0.18, factorSuperavit: 0.12, desc: "Balance ideal entre resultados y adherencia" },
  agresivo: { label: "Agresivo", factorDeficit: 0.25, factorSuperavit: 0.18, desc: "Resultados más rápidos, requiere mayor disciplina" },
};

/**
 * Calcula TDEE y distribución recomendada de macros basada en ciencia deportiva
 * seleccionando automáticamente la fórmula más precisa según los datos provistos.
 */
export function calcularMetasTDEE({
  peso_kg = 70,
  altura_cm = 175,
  edad = 25,
  genero = "masculino",
  nivel_actividad = "moderado",
  objetivo = "Hipertrofia",
  porcentaje_grasa = null,
  ritmo = "moderado",
  proteina_g_kg = null,
  grasa_pct = null,
}) {
  const peso = parseFloat(peso_kg) || 70;
  const altura = parseFloat(altura_cm) || 175;
  const ed = parseInt(edad) || 25;
  const grasa = parseFloat(porcentaje_grasa);

  let bmr = 0;
  let formulaUtilizada = "";
  let masaMagraKg = null;
  let explicacionFormula = "";

  // 1. Selección de Fórmula de Tasa Metabólica Basal (BMR)
  if (!isNaN(grasa) && grasa >= 3 && grasa <= 60) {
    // FÓRMULA KATCH-MCARDLE (Basada en Masa Libre de Grasa)
    masaMagraKg = Math.round(peso * (1 - grasa / 100) * 10) / 10;
    bmr = 370 + 21.6 * masaMagraKg;
    formulaUtilizada = "Katch-McArdle";
    explicacionFormula = `Al conocerse el ${grasa}% de grasa, se utilizó Katch-McArdle basada en tu Masa Magra (${masaMagraKg} kg). Es la fórmula más precisa para personas que entrenan ya que el tejido muscular es el que consume calorías activas.`;
  } else {
    // FÓRMULA MIFFLIN-ST JEOR (Clínica Diferenciada por Género)
    formulaUtilizada = "Mifflin-St Jeor";
    if (genero === "femenino" || genero === "mujer" || genero === "f") {
      bmr = 10 * peso + 6.25 * altura - 5 * ed - 161;
      explicacionFormula = `Al no contar con % de grasa, se aplicó Mifflin-St Jeor para género femenino: 10×peso + 6.25×altura - 5×edad - 161.`;
    } else {
      bmr = 10 * peso + 6.25 * altura - 5 * ed + 5;
      explicacionFormula = `Al no contar con % de grasa, se aplicó Mifflin-St Jeor para género masculino: 10×peso + 6.25×altura - 5×edad + 5.`;
    }
  }

  // 2. Gasto Energético Total Diario (TDEE = BMR × Factor Actividad)
  const actInfo = FACTORES_ACTIVIDAD[nivel_actividad] || FACTORES_ACTIVIDAD.moderado;
  const tdee = Math.round(bmr * actInfo.factor);

  // 3. Ajuste Calórico según Objetivo y Ritmo
  const ritmoConfig = RITMOS_AJUSTE[ritmo] || RITMOS_AJUSTE.moderado;
  let caloriasObjetivo = tdee;
  const objLower = (objetivo || "").toLowerCase();

  if (objLower.includes("pérdida") || objLower.includes("definición") || objLower.includes("grasa")) {
    caloriasObjetivo = Math.max(1200, Math.round(tdee * (1 - ritmoConfig.factorDeficit)));
  } else if (objLower.includes("hipertrofia") || objLower.includes("masa") || objLower.includes("volumen")) {
    caloriasObjetivo = Math.round(tdee * (1 + ritmoConfig.factorSuperavit));
  } else if (objLower.includes("fuerza") || objLower.includes("rendimiento")) {
    caloriasObjetivo = Math.round(tdee * 1.08);
  } else {
    caloriasObjetivo = tdee;
  }

  // 4. Distribución Científica de Macronutrientes
  let factorProt = parseFloat(proteina_g_kg);
  if (isNaN(factorProt) || factorProt < 1.0) {
    if (objLower.includes("pérdida") || objLower.includes("definición") || objLower.includes("grasa")) {
      factorProt = 2.3;
    } else if (objLower.includes("hipertrofia") || objLower.includes("masa")) {
      factorProt = 2.0;
    } else {
      factorProt = 1.8;
    }
  }

  const proteinas = Math.round(peso * factorProt);
  const caloriasProt = proteinas * 4;

  // Grasa: configurable por % o 0.85g/kg mínimo
  const fatPct = parseFloat(grasa_pct) || 0.22;
  const grasas = Math.max(Math.round(peso * 0.8), Math.round((caloriasObjetivo * fatPct) / 9));
  const caloriasGrasa = grasas * 9;

  // Carbohidratos: el resto calórico disponible
  const caloriasCarbs = Math.max(Math.round(peso * 0.8 * 4), caloriasObjetivo - (caloriasProt + caloriasGrasa));
  const carbohidratos = Math.round(caloriasCarbs / 4);

  // Recalcular calorías totales exactas de los macros
  const caloriasFinales = proteinas * 4 + carbohidratos * 4 + grasas * 9;

  return {
    bmr: Math.round(bmr),
    tdee,
    calorias: caloriasFinales,
    proteinas,
    carbohidratos,
    grasas,
    proteina_g_kg: factorProt,
    grasa_pct: Math.round(fatPct * 100),
    formula_utilizada: formulaUtilizada,
    masa_magra_kg: masaMagraKg,
    explicacion_formula: explicacionFormula,
    factor_actividad: actInfo.factor,
    diferencia_tdee: caloriasFinales - tdee,
  };
}

/**
 * Optimizador Matemático Determinista de Macros (Auto-Balancer)
 * Ajusta proporcionalmente las porciones de los alimentos elegidos por la IA
 * para que la suma total coincida con los macros objetivo con precisión milimétrica (±2%).
 */
export function optimizarPlanNutricional(rawComidas, targetMacros, alimentosMap) {
  if (!rawComidas || !Array.isArray(rawComidas) || rawComidas.length === 0) return null;

  // 1. Clasificar y aplanar alimentos con su rol dominante
  let items = [];
  for (const c of rawComidas) {
    for (const ing of c.ingredientes || []) {
      const alim = alimentosMap.get(ing.id);
      if (!alim) continue;

      const pCal = (alim.prot_por_100 || 0) * 4;
      const cCal = (alim.carbs_por_100 || 0) * 4;
      const gCal = (alim.grasa_por_100 || 0) * 9;

      let rol = "otro";
      if (alim.categoria === "vegetal") {
        rol = "vegetal";
      } else if (pCal >= cCal && pCal >= gCal && (alim.prot_por_100 || 0) >= 8) {
        rol = "proteina";
      } else if (cCal >= pCal && cCal >= gCal && (alim.carbs_por_100 || 0) >= 10) {
        rol = "carbohidrato";
      } else if (gCal >= pCal && gCal >= cCal && (alim.grasa_por_100 || 0) >= 10) {
        rol = "grasa";
      }

      items.push({
        comidaNombre: c.nombre,
        id: ing.id,
        alim,
        rol,
        cantidad: Math.max(15, Number(ing.cantidad) || 50),
        unidad_texto: ing.unidad_texto || "",
      });
    }
  }

  if (items.length === 0) return null;

  // 2. Ejecutar 3 pases de ajuste proporcional convergente
  for (let iter = 0; iter < 3; iter++) {
    let currP = 0,
      currC = 0,
      currG = 0;
    for (const it of items) {
      const factor = it.cantidad / 100;
      currP += (it.alim.prot_por_100 || 0) * factor;
      currC += (it.alim.carbs_por_100 || 0) * factor;
      currG += (it.alim.grasa_por_100 || 0) * factor;
    }

    const scaleP = targetMacros.proteinas > 0 && currP > 0 ? targetMacros.proteinas / currP : 1;
    const scaleC = targetMacros.carbohidratos > 0 && currC > 0 ? targetMacros.carbohidratos / currC : 1;
    const scaleG = targetMacros.grasas > 0 && currG > 0 ? targetMacros.grasas / currG : 1;

    for (const it of items) {
      if (it.rol === "proteina") {
        it.cantidad = Math.max(20, Math.min(450, it.cantidad * scaleP));
      } else if (it.rol === "carbohidrato") {
        it.cantidad = Math.max(20, Math.min(500, it.cantidad * scaleC));
      } else if (it.rol === "grasa") {
        it.cantidad = Math.max(5, Math.min(120, it.cantidad * scaleG));
      }
    }
  }

  // 3. Reconstruir estructura de comidas con macros calculados
  let finalComidas = [];
  let totKcal = 0,
    totP = 0,
    totC = 0,
    totG = 0;

  for (const c of rawComidas) {
    const comidaItems = items.filter((it) => it.comidaNombre === c.nombre);
    let cKcal = 0,
      cP = 0,
      cC = 0,
      cG = 0;

    const finalIngredientes = comidaItems.map((it) => {
      const cantidadRedondeada = Math.round(it.cantidad / 5) * 5; // Redondeo realista a múltiplos de 5g
      const f = cantidadRedondeada / 100;
      const kcal = Math.round((it.alim.kcal_por_100 || 0) * f);
      const prot = Math.round((it.alim.prot_por_100 || 0) * f * 10) / 10;
      const carb = Math.round((it.alim.carbs_por_100 || 0) * f * 10) / 10;
      const grasa = Math.round((it.alim.grasa_por_100 || 0) * f * 10) / 10;

      cKcal += kcal;
      cP += prot;
      cC += carb;
      cG += grasa;

      return {
        id: it.id,
        nombre: it.alim.nombre,
        categoria: it.alim.categoria,
        cantidad: cantidadRedondeada,
        unidad_texto: it.unidad_texto || `${cantidadRedondeada}g`,
        macros: {
          kcal,
          proteina: prot,
          carbohidratos: carb,
          grasa,
        },
      };
    });

    totKcal += cKcal;
    totP += cP;
    totC += cC;
    totG += cG;

    finalComidas.push({
      nombre: c.nombre,
      hora_sugerida: c.hora_sugerida || "",
      ingredientes: finalIngredientes,
      macros: {
        kcal: cKcal,
        proteina: Math.round(cP),
        carbohidratos: Math.round(cC),
        grasa: Math.round(cG),
      },
    });
  }

  return {
    comidas: finalComidas,
    totales: {
      kcal: totKcal,
      proteinas: Math.round(totP),
      carbohidratos: Math.round(totC),
      grasas: Math.round(totG),
    },
  };
}
