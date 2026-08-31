"use client";

import { useState, useRef, useMemo } from "react";
import {
  Apple,
  Sparkles,
  Mic,
  MicOff,
  Flame,
  Scale,
  Calculator,
  Plus,
  Trash2,
  Edit2,
  Save,
  Share2,
  Printer,
  CheckCircle2,
  AlertCircle,
  Users,
  ChevronRight,
  Clock,
  Utensils,
  Target,
  MessageCircle,
  X,
  Loader2,
  PieChart,
  Search,
  Check,
  Download
} from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { FACTORES_ACTIVIDAD, RITMOS_AJUSTE, calcularMetasTDEE } from "@/lib/nutricionOptimizer";
import BotonDescargaDietaPDF from "@/components/BotonDescargaDietaPDF";
import { buscarAlimentos, CATALOGO_ALIMENTOS } from "@/lib/alimentosCatalogo";

export default function NutricionManager({
  clientes = [],
  planesIniciales = [],
  coachId,
  coachNombre = "Coach Olympo",
  coachTenant = "",
  coachLogo = null,
  coachColorPrimario = "#10B981",
}) {
  const [planes, setPlanes] = useState(planesIniciales || []);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activeTab, setActiveTab] = useState("catalogo"); // 'catalogo' | 'editor'

  // Modal Generator IA
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");

  // Modal TDEE Calculator
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [tdeeForm, setTdeeForm] = useState({
    peso_kg: 75,
    altura_cm: 178,
    edad: 26,
    genero: "masculino",
    conoce_grasa: true,
    porcentaje_grasa: 15,
    nivel_actividad: "moderado",
    objetivo: "Hipertrofia",
    ritmo: "moderado",
    proteina_g_kg: 2.0,
    grasa_pct: 0.22,
  });

  // Estado para Buscador / Creador de Alimentos en Comidas
  const [foodPickerState, setFoodPickerState] = useState({
    isOpen: false,
    cIdx: null,
    query: "",
    categoria: "",
  });
  const [customFoodForm, setCustomFoodForm] = useState({
    nombre: "",
    cantidad: 100,
    unidad_texto: "100g",
    kcal_por_100: 150,
    prot_por_100: 20,
    carbs_por_100: 10,
    grasa_por_100: 3,
  });
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Cálculo TDEE Reactivo en Tiempo Real
  const liveTdeeResult = useMemo(() => {
    return calcularMetasTDEE({
      peso_kg: tdeeForm.peso_kg,
      altura_cm: tdeeForm.altura_cm,
      edad: tdeeForm.edad,
      genero: tdeeForm.genero,
      nivel_actividad: tdeeForm.nivel_actividad,
      objetivo: tdeeForm.objetivo,
      porcentaje_grasa: tdeeForm.conoce_grasa ? tdeeForm.porcentaje_grasa : null,
      ritmo: tdeeForm.ritmo,
      proteina_g_kg: tdeeForm.proteina_g_kg,
      grasa_pct: tdeeForm.grasa_pct,
    });
  }, [tdeeForm]);

  // Generator Form State
  const [genForm, setGenForm] = useState({
    cliente_id: "",
    objetivo: "Hipertrofia",
    numero_comidas: 4,
    calorias: 2400,
    proteinas: 160,
    carbohidratos: 280,
    grasas: 65,
    preferencias: "",
    alergias_exclusiones: "",
    comando_voz: ""
  });

  // Grabación de Voz con Whisper
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Editor State
  const [currentPlan, setCurrentPlan] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Manejo de Selección de Alumno en Generador
  const handleSelectCliente = (clienteId) => {
    const cl = clientes.find((c) => c.id === clienteId);
    if (cl) {
      const metas = calcularMetasTDEE({
        peso_kg: cl.peso_kg || 72,
        altura_cm: cl.altura_cm || 175,
        edad: 26,
        genero: "masculino",
        nivel_actividad: "moderado",
        objetivo: cl.objetivo || "Hipertrofia",
        porcentaje_grasa: cl.grasa_corporal || null
      });

      setGenForm((prev) => ({
        ...prev,
        cliente_id: clienteId,
        objetivo: cl.objetivo || "Hipertrofia",
        calorias: cl.calorias_meta || metas.calorias,
        proteinas: cl.proteinas_meta || metas.proteinas,
        carbohidratos: cl.carbohidratos_meta || metas.carbohidratos,
        grasas: cl.grasas_meta || metas.grasas,
        alergias_exclusiones: cl.lesiones ? `Considerar salud: ${cl.lesiones}` : prev.alergias_exclusiones
      }));
    } else {
      setGenForm((prev) => ({ ...prev, cliente_id: "" }));
    }
  };

  // 2. Grabación de Voz por Micrófono
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await handleTranscribeAudio(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accediendo al micrófono:", err);
      alert("No se pudo acceder al micrófono. Verifica los permisos de tu navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscribeAudio = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "dieta_dictado.webm");

      const res = await fetchWithAuth("/api/rutinas/transcribir", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al transcribir");

      setGenForm((prev) => ({
        ...prev,
        comando_voz: prev.comando_voz ? `${prev.comando_voz} ${data.text}` : data.text
      }));
    } catch (err) {
      console.error("Error en transcripción:", err);
      alert("Error al transcribir audio: " + err.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  // 3. Ejecutar Generador IA con Auto-Balancer
  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenerationStep("🤖 Diseñando menú personalizado con Inteligencia Artificial...");

    try {
      const payload = {
        objetivo: genForm.objetivo,
        numero_comidas: genForm.numero_comidas,
        preferencias: genForm.preferencias,
        alergias_exclusiones: genForm.alergias_exclusiones,
        comando_voz: genForm.comando_voz,
        metas_manuales: {
          calorias: genForm.calorias,
          proteinas: genForm.proteinas,
          carbohidratos: genForm.carbohidratos,
          grasas: genForm.grasas
        }
      };

      const res = await fetchWithAuth("/api/nutricion/generar-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al generar el plan");

      const generatedPlan = {
        ...data.plan,
        cliente_id: genForm.cliente_id || null,
        cliente_nombre: genForm.cliente_id ? clientes.find((c) => c.id === genForm.cliente_id)?.nombre : ""
      };

      setCurrentPlan(generatedPlan);
      setIsGeneratorOpen(false);
      setActiveTab("editor");
    } catch (err) {
      console.error(err);
      alert("Error generando plan nutricional: " + err.message);
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  const handleApplyTDEEToGenerator = () => {
    if (!liveTdeeResult) return;
    setGenForm((prev) => ({
      ...prev,
      calorias: liveTdeeResult.calorias,
      proteinas: liveTdeeResult.proteinas,
      carbohidratos: liveTdeeResult.carbohidratos,
      grasas: liveTdeeResult.grasas,
      objetivo: tdeeForm.objetivo
    }));
    setIsCalculatorOpen(false);
    setIsGeneratorOpen(true);
  };

  // Función de Recalculación Matemática Exacta del Plan de Alimentación
  const recalculatePlan = (plan) => {
    let totKcal = 0,
      totP = 0,
      totC = 0,
      totG = 0;

    const updatedComidas = (plan.comidas || []).map((comida) => {
      let cKcal = 0,
        cP = 0,
        cC = 0,
        cG = 0;

      const updatedIngredientes = (comida.ingredientes || []).map((ing) => {
        const cant = Math.max(0, Number(ing.cantidad) || 0);
        const factor = cant / 100;

        let p100 = Number(ing.prot_por_100);
        let c100 = Number(ing.carbs_por_100);
        let g100 = Number(ing.grasa_por_100);
        let k100 = Number(ing.kcal_por_100);

        if (isNaN(p100) || p100 === 0) {
          p100 = ing.macros?.proteina != null && ing.cantidad ? ing.macros.proteina / (ing.cantidad / 100) : 0;
        }
        if (isNaN(c100) || c100 === 0) {
          c100 = ing.macros?.carbohidratos != null && ing.cantidad ? ing.macros.carbohidratos / (ing.cantidad / 100) : 0;
        }
        if (isNaN(g100) || g100 === 0) {
          g100 = ing.macros?.grasa != null && ing.cantidad ? ing.macros.grasa / (ing.cantidad / 100) : 0;
        }
        if (isNaN(k100) || k100 === 0) {
          k100 = p100 * 4 + c100 * 4 + g100 * 9;
        }

        const kcal = Math.round(k100 * factor);
        const proteina = Math.round(p100 * factor * 10) / 10;
        const carbohidratos = Math.round(c100 * factor * 10) / 10;
        const grasa = Math.round(g100 * factor * 10) / 10;

        cKcal += kcal;
        cP += proteina;
        cC += carbohidratos;
        cG += grasa;

        return {
          ...ing,
          cantidad: cant,
          prot_por_100: p100,
          carbs_por_100: c100,
          grasa_por_100: g100,
          kcal_por_100: k100,
          macros: { kcal, proteina, carbohidratos, grasa },
        };
      });

      totKcal += cKcal;
      totP += cP;
      totC += cC;
      totG += cG;

      return {
        ...comida,
        ingredientes: updatedIngredientes,
        macros: {
          kcal: cKcal,
          proteina: Math.round(cP),
          carbohidratos: Math.round(cC),
          grasa: Math.round(cG),
        },
      };
    });

    return {
      ...plan,
      comidas: updatedComidas,
      totales_calculados: {
        kcal: totKcal,
        proteinas: Math.round(totP),
        carbohidratos: Math.round(totC),
        grasas: Math.round(totG),
      },
    };
  };

  // Manejo de Edición de Ingredientes y Comidas
  const handleUpdateIngredientQty = (cIdx, iIdx, newQty) => {
    if (!currentPlan) return;
    const clone = JSON.parse(JSON.stringify(currentPlan));
    if (clone.comidas[cIdx]?.ingredientes[iIdx]) {
      const val = parseFloat(newQty) || 0;
      clone.comidas[cIdx].ingredientes[iIdx].cantidad = val;
      clone.comidas[cIdx].ingredientes[iIdx].unidad_texto = `${val}g`;
      const recalculated = recalculatePlan(clone);
      setCurrentPlan(recalculated);
    }
  };

  const handleUpdateIngredientName = (cIdx, iIdx, newName) => {
    if (!currentPlan) return;
    const clone = JSON.parse(JSON.stringify(currentPlan));
    if (clone.comidas[cIdx]?.ingredientes[iIdx]) {
      clone.comidas[cIdx].ingredientes[iIdx].nombre = newName;
      setCurrentPlan(clone);
    }
  };

  const handleDeleteIngredient = (cIdx, iIdx) => {
    if (!currentPlan) return;
    const clone = JSON.parse(JSON.stringify(currentPlan));
    if (clone.comidas[cIdx]?.ingredientes) {
      clone.comidas[cIdx].ingredientes.splice(iIdx, 1);
      const recalculated = recalculatePlan(clone);
      setCurrentPlan(recalculated);
    }
  };

  const handleOpenFoodPicker = (cIdx) => {
    setFoodPickerState({
      isOpen: true,
      cIdx,
      query: "",
      categoria: "",
    });
    setIsCustomMode(false);
  };

  const handleSelectFoodFromPicker = (food) => {
    if (!currentPlan || foodPickerState.cIdx === null) return;
    const clone = JSON.parse(JSON.stringify(currentPlan));
    const targetMeal = clone.comidas[foodPickerState.cIdx];
    if (!targetMeal) return;

    if (!targetMeal.ingredientes) targetMeal.ingredientes = [];

    const defaultQty = food.peso_unidad || 100;
    const factor = defaultQty / 100;
    const kcal = Math.round((food.kcal_por_100 || 0) * factor);
    const proteina = Math.round((food.prot_por_100 || 0) * factor * 10) / 10;
    const carbohidratos = Math.round((food.carbs_por_100 || 0) * factor * 10) / 10;
    const grasa = Math.round((food.grasa_por_100 || 0) * factor * 10) / 10;

    targetMeal.ingredientes.push({
      id: food.id,
      nombre: food.nombre,
      categoria: food.categoria || "otro",
      cantidad: defaultQty,
      unidad_texto: food.unidad_label ? `1 ${food.unidad_label} (${defaultQty}g)` : `${defaultQty}g`,
      prot_por_100: food.prot_por_100 || 0,
      carbs_por_100: food.carbs_por_100 || 0,
      grasa_por_100: food.grasa_por_100 || 0,
      kcal_por_100: food.kcal_por_100 || 0,
      macros: { kcal, proteina, carbohidratos, grasa },
    });

    const recalculated = recalculatePlan(clone);
    setCurrentPlan(recalculated);
    setFoodPickerState({ isOpen: false, cIdx: null, query: "", categoria: "" });
  };

  const handleAddCustomFood = (e) => {
    e.preventDefault();
    if (!currentPlan || foodPickerState.cIdx === null || !customFoodForm.nombre) return;
    const clone = JSON.parse(JSON.stringify(currentPlan));
    const targetMeal = clone.comidas[foodPickerState.cIdx];
    if (!targetMeal) return;

    if (!targetMeal.ingredientes) targetMeal.ingredientes = [];

    const qty = parseFloat(customFoodForm.cantidad) || 100;
    const factor = qty / 100;
    const p100 = parseFloat(customFoodForm.prot_por_100) || 0;
    const c100 = parseFloat(customFoodForm.carbs_por_100) || 0;
    const g100 = parseFloat(customFoodForm.grasa_por_100) || 0;
    const k100 = parseFloat(customFoodForm.kcal_por_100) || (p100 * 4 + c100 * 4 + g100 * 9);

    const kcal = Math.round(k100 * factor);
    const proteina = Math.round(p100 * factor * 10) / 10;
    const carbohidratos = Math.round(c100 * factor * 10) / 10;
    const grasa = Math.round(g100 * factor * 10) / 10;

    targetMeal.ingredientes.push({
      id: `custom_${Date.now()}`,
      nombre: customFoodForm.nombre,
      categoria: "otro",
      cantidad: qty,
      unidad_texto: customFoodForm.unidad_texto || `${qty}g`,
      prot_por_100: p100,
      carbs_por_100: c100,
      grasa_por_100: g100,
      kcal_por_100: k100,
      macros: { kcal, proteina, carbohidratos, grasa },
    });

    const recalculated = recalculatePlan(clone);
    setCurrentPlan(recalculated);
    setFoodPickerState({ isOpen: false, cIdx: null, query: "", categoria: "" });
    setCustomFoodForm({ nombre: "", cantidad: 100, unidad_texto: "100g", kcal_por_100: 150, prot_por_100: 20, carbs_por_100: 10, grasa_por_100: 3 });
  };

  const handleAddMeal = () => {
    if (!currentPlan) return;
    const clone = JSON.parse(JSON.stringify(currentPlan));
    if (!clone.comidas) clone.comidas = [];
    const num = clone.comidas.length + 1;
    clone.comidas.push({
      nombre: `Comida ${num}`,
      hora_sugerida: `${(num * 3 + 6).toString().padStart(2, "0")}:00`,
      ingredientes: [],
      macros: { kcal: 0, proteina: 0, carbohidratos: 0, grasa: 0 },
    });
    setCurrentPlan(clone);
  };

  const handleDeleteMeal = (cIdx) => {
    if (!currentPlan) return;
    const clone = JSON.parse(JSON.stringify(currentPlan));
    clone.comidas.splice(cIdx, 1);
    const recalculated = recalculatePlan(clone);
    setCurrentPlan(recalculated);
  };

  const handleUpdateMealName = (cIdx, newName) => {
    if (!currentPlan) return;
    const clone = JSON.parse(JSON.stringify(currentPlan));
    if (clone.comidas[cIdx]) {
      clone.comidas[cIdx].nombre = newName;
      setCurrentPlan(clone);
    }
  };

  const handleUpdateMealTime = (cIdx, newTime) => {
    if (!currentPlan) return;
    const clone = JSON.parse(JSON.stringify(currentPlan));
    if (clone.comidas[cIdx]) {
      clone.comidas[cIdx].hora_sugerida = newTime;
      setCurrentPlan(clone);
    }
  };

  const handleAddRecommendation = () => {
    if (!currentPlan) return;
    const clone = JSON.parse(JSON.stringify(currentPlan));
    if (!clone.recomendaciones) clone.recomendaciones = [];
    clone.recomendaciones.push("Beber mínimo 2.5 a 3 litros de agua durante el día.");
    setCurrentPlan(clone);
  };

  const handleUpdateRecommendation = (idx, text) => {
    if (!currentPlan) return;
    const clone = JSON.parse(JSON.stringify(currentPlan));
    if (clone.recomendaciones) {
      clone.recomendaciones[idx] = text;
      setCurrentPlan(clone);
    }
  };

  const handleDeleteRecommendation = (idx) => {
    if (!currentPlan) return;
    const clone = JSON.parse(JSON.stringify(currentPlan));
    if (clone.recomendaciones) {
      clone.recomendaciones.splice(idx, 1);
      setCurrentPlan(clone);
    }
  };

  // 5. Guardar Plan en Base de Datos
  const handleSavePlan = async () => {
    if (!currentPlan || !currentPlan.titulo) return;
    setIsSaving(true);

    try {
      const payload = {
        id: currentPlan.id || null,
        cliente_id: currentPlan.cliente_id || null,
        titulo: currentPlan.titulo,
        descripcion: currentPlan.descripcion,
        metas_objetivo: currentPlan.metas_objetivo,
        totales_calculados: currentPlan.totales_calculados,
        comidas: currentPlan.comidas,
        recomendaciones: currentPlan.recomendaciones,
        coach_id: coachId
      };

      const res = await fetchWithAuth("/api/nutricion/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al guardar");

      const saved = data.plan;
      setPlanes((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
      setCurrentPlan(saved);
      alert("✨ ¡Plan de alimentación guardado y asignado con éxito!");
    } catch (err) {
      console.error(err);
      alert("Error al guardar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Generar Texto para WhatsApp
  const handleShareWhatsApp = () => {
    if (!currentPlan) return;
    const cl = clientes.find((c) => c.id === currentPlan.cliente_id);
    const nombreDest = cl ? cl.nombre : "Atleta";

    let msg = `🥗 *PLAN DE ALIMENTACIÓN: ${currentPlan.titulo.toUpperCase()}*\n`;
    msg += `👤 *Para:* ${nombreDest}\n`;
    msg += `🔥 *Objetivo Diario:* ${currentPlan.totales_calculados?.kcal || currentPlan.metas_objetivo?.calorias} kcal\n`;
    msg += `📊 *Macros:* ${currentPlan.totales_calculados?.proteinas}g Prot | ${currentPlan.totales_calculados?.carbohidratos}g Carbs | ${currentPlan.totales_calculados?.grasas}g Grasa\n\n`;

    (currentPlan.comidas || []).forEach((c, i) => {
      msg += `🍽️ *COMIDA ${i + 1}: ${c.nombre.toUpperCase()}* (${c.hora_sugerida || ""})\n`;
      msg += `   _Macros:_ ${c.macros.kcal} kcal • ${c.macros.proteina}g P • ${c.macros.carbohidratos}g C • ${c.macros.grasa}g G\n`;
      (c.ingredientes || []).forEach((ing) => {
        msg += `   • ${ing.nombre}: *${ing.unidad_texto || `${ing.cantidad}g`}*\n`;
      });
      msg += `\n`;
    });

    if (currentPlan.recomendaciones && currentPlan.recomendaciones.length > 0) {
      msg += `💡 *RECOMENDACIONES DEL COACH:*\n`;
      currentPlan.recomendaciones.forEach((r) => {
        msg += `• ${r}\n`;
      });
    }

    const cleanPhone = cl?.telefono ? cl.telefono.replace(/[^0-9]/g, "") : "";
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Apple className="w-7 h-7 text-emerald-400" />
            Nutrición & Planes de Alimentación
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Diseño inteligente de dietas con optimizador matemático de macros (*Auto-Balancer*), dictado por voz y asignación.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsCalculatorOpen(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all shadow"
          >
            <Calculator className="w-4 h-4 text-sky-400" /> Calculadora TDEE
          </button>

          <button
            onClick={() => {
              setIsGeneratorOpen(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all shadow-lg shadow-emerald-600/25 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-amber-300" /> Generar con IA & Voz
          </button>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="flex gap-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab("catalogo")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === "catalogo"
              ? "bg-slate-800 text-white border border-slate-700 shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Utensils className="w-4 h-4 text-emerald-400" /> Mis Planes de Nutrición ({planes.length})
        </button>

        {currentPlan && (
          <button
            onClick={() => setActiveTab("editor")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === "editor"
                ? "bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Edit2 className="w-4 h-4 text-emerald-400" /> Plan en Edición: {currentPlan.titulo}
          </button>
        )}
      </div>

      {/* VISTA 1: CATÁLOGO DE PLANES */}
      {activeTab === "catalogo" && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planes.map((p) => {
              const cl = clientes.find((c) => c.id === p.cliente_id);
              const totalKcal = p.calorias_totales || p.totales?.kcal || p.totales_calculados?.kcal || 2000;
              const prot = p.proteinas_g || p.totales?.proteinas || p.totales_calculados?.proteinas || 150;
              const carbs = p.carbohidratos_g || p.totales?.carbohidratos || p.totales_calculados?.carbohidratos || 200;
              const grasa = p.grasas_g || p.totales?.grasas || p.totales_calculados?.grasas || 60;

              return (
                <div
                  key={p.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all shadow-lg flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        <Utensils className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                        {p.comidas?.length || 4} Comidas
                      </span>
                    </div>

                    <h3 className="font-extrabold text-white text-base group-hover:text-emerald-300 transition-colors line-clamp-1">
                      {p.titulo}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {p.descripcion || "Plan nutricional estructurado con balance de macronutrientes."}
                    </p>

                    {/* Alumno Asignado */}
                    <div className="mt-3.5 flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950/60 border border-slate-800/80 rounded-xl p-2">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-slate-400">Asignado a:</span>
                      <strong className="text-white truncate">{cl?.nombre || p.coach_clientes?.nombre || "Sin asignar"}</strong>
                    </div>

                    {/* Resumen de Macros */}
                    <div className="grid grid-cols-4 gap-1.5 bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 mt-3 text-center">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">Kcal</span>
                        <span className="text-xs font-black text-white">{totalKcal}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-emerald-400 uppercase">Prot</span>
                        <span className="text-xs font-bold text-emerald-300">{prot}g</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-sky-400 uppercase">Carbs</span>
                        <span className="text-xs font-bold text-sky-300">{carbs}g</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-amber-400 uppercase">Grasa</span>
                        <span className="text-xs font-bold text-amber-300">{grasa}g</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-4">
                    <button
                      onClick={() => {
                        setCurrentPlan(p);
                        setActiveTab("editor");
                      }}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600/20 text-slate-200 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Ver / Editar
                    </button>
                    <BotonDescargaDietaPDF
                      plan={p}
                      coachNombre={coachNombre}
                      coachTenant={coachTenant}
                      coachLogo={coachLogo}
                      coachColorPrimario={coachColorPrimario}
                      clienteNombre={cl?.nombre || p.coach_clientes?.nombre || ""}
                      compact={true}
                    />
                  </div>
                </div>
              );
            })}

            {planes.length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl p-6">
                <Apple className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-lg font-bold text-white">No tienes planes de nutrición creados</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Usa el generador inteligente con IA o la calculadora TDEE para crear tu primera dieta personalizada.
                </p>
                <button
                  onClick={() => setIsGeneratorOpen(true)}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                >
                  ✨ Crear Plan con IA
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 2: EDITOR / VISOR DEL PLAN */}
      {activeTab === "editor" && currentPlan && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header del Plan en Edición */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="space-y-1.5 flex-1 w-full">
              <input
                type="text"
                value={currentPlan.titulo}
                onChange={(e) => setCurrentPlan({ ...currentPlan, titulo: e.target.value })}
                className="bg-transparent text-xl sm:text-2xl font-black text-white focus:outline-none focus:border-b border-emerald-500 w-full"
                placeholder="Título del Plan Nutricional"
              />
              <input
                type="text"
                value={currentPlan.descripcion || ""}
                onChange={(e) => setCurrentPlan({ ...currentPlan, descripcion: e.target.value })}
                className="bg-transparent text-xs text-slate-400 focus:outline-none w-full"
                placeholder="Descripción del enfoque o estrategia nutricional..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={currentPlan.cliente_id || ""}
                onChange={(e) => setCurrentPlan({ ...currentPlan, cliente_id: e.target.value || null })}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">— Asignar a un Alumno —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    👤 {c.nombre}
                  </option>
                ))}
              </select>

              <BotonDescargaDietaPDF
                plan={currentPlan}
                coachNombre={coachNombre}
                coachTenant={coachTenant}
                coachLogo={coachLogo}
                coachColorPrimario={coachColorPrimario}
                clienteNombre={clientes.find((c) => c.id === currentPlan.cliente_id)?.nombre || ""}
              />

              <button
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-500/30 transition-all"
                title="Compartir dieta por WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>

              <button
                onClick={handleSavePlan}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isSaving ? "Guardando..." : "Guardar Plan"}
              </button>
            </div>
          </div>

          {/* Barra de Totales y Macros */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> Calorías Totales
              </span>
              <div className="text-2xl font-black text-white mt-1">
                {currentPlan.totales_calculados?.kcal || currentPlan.calorias_totales || 2000}{" "}
                <span className="text-xs font-normal text-slate-400">kcal</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                🥩 Proteína
              </span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {currentPlan.totales_calculados?.proteinas || currentPlan.proteinas_g || 150}{" "}
                <span className="text-xs font-normal text-slate-400">g</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-sky-400 uppercase flex items-center gap-1">
                🍚 Carbohidratos
              </span>
              <div className="text-2xl font-black text-sky-400 mt-1">
                {currentPlan.totales_calculados?.carbohidratos || currentPlan.carbohidratos_g || 200}{" "}
                <span className="text-xs font-normal text-slate-400">g</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-amber-400 uppercase flex items-center gap-1">
                🥑 Grasas
              </span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {currentPlan.totales_calculados?.grasas || currentPlan.grasas_g || 60}{" "}
                <span className="text-xs font-normal text-slate-400">g</span>
              </div>
            </div>
          </div>

          {/* Listado de Comidas Editables */}
          <div className="space-y-5">
            {(currentPlan.comidas || []).map((comida, cIdx) => (
              <div key={cIdx} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
                {/* Header de la Comida */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5 flex-1 w-full sm:w-auto">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 font-black text-xs flex items-center justify-center border border-emerald-500/20 shrink-0">
                      {cIdx + 1}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={comida.nombre}
                        onChange={(e) => handleUpdateMealName(cIdx, e.target.value)}
                        className="font-extrabold text-white text-base bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-1.5 focus:outline-none flex-1 min-w-[160px]"
                        placeholder="Nombre de la comida (ej: Desayuno)"
                      />
                      <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          value={comida.hora_sugerida || ""}
                          onChange={(e) => handleUpdateMealTime(cIdx, e.target.value)}
                          className="bg-transparent text-slate-300 w-20 focus:outline-none text-xs"
                          placeholder="08:00 AM"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="flex items-center gap-2 text-xs bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300 font-mono">
                      <span className="text-white font-bold">{comida.macros?.kcal} kcal</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">{comida.macros?.proteina}g P</span>
                      <span>•</span>
                      <span className="text-sky-400 font-bold">{comida.macros?.carbohidratos}g C</span>
                      <span>•</span>
                      <span className="text-amber-400 font-bold">{comida.macros?.grasa}g G</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteMeal(cIdx)}
                      className="text-slate-500 hover:text-rose-400 p-2 rounded-xl hover:bg-slate-800 transition-colors"
                      title="Eliminar esta comida"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Ingredientes de la Comida */}
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(comida.ingredientes || []).map((ing, iIdx) => (
                    <div
                      key={iIdx}
                      className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex flex-col justify-between transition-all space-y-2.5 group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <input
                          type="text"
                          value={ing.nombre}
                          onChange={(e) => handleUpdateIngredientName(cIdx, iIdx, e.target.value)}
                          className="font-bold text-white text-xs bg-transparent focus:bg-slate-900 border-b border-transparent focus:border-emerald-500 focus:outline-none w-full"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteIngredient(cIdx, iIdx)}
                          className="text-slate-600 hover:text-rose-400 transition-colors p-1 rounded-md"
                          title="Eliminar ingrediente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Control de Cantidad Editable */}
                      <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Cantidad:</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={ing.cantidad}
                          onChange={(e) => handleUpdateIngredientQty(cIdx, iIdx, e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs font-bold text-emerald-400 text-center focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-[11px] font-semibold text-slate-400">
                          {ing.unidad_texto && ing.unidad_texto.includes(" ") ? ing.unidad_texto.split(" ")[1] : "g"}
                        </span>
                      </div>

                      {/* Macros del Ingrediente */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-900 font-mono">
                        <span className="text-slate-300 font-bold">{ing.macros?.kcal} kcal</span>
                        <span className="text-emerald-400 font-semibold">{ing.macros?.proteina}g P</span>
                        <span className="text-sky-400 font-semibold">{ing.macros?.carbohidratos}g C</span>
                        <span className="text-amber-400 font-semibold">{ing.macros?.grasa}g G</span>
                      </div>
                    </div>
                  ))}

                  {/* Botón Agregar Alimento a la Comida */}
                  <button
                    type="button"
                    onClick={() => handleOpenFoodPicker(cIdx)}
                    className="h-full min-h-[95px] border border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-950/40 hover:bg-emerald-500/5 rounded-2xl flex flex-col items-center justify-center p-3 text-slate-400 hover:text-emerald-400 transition-all gap-1 text-xs font-bold"
                  >
                    <Plus className="w-5 h-5 text-emerald-400" />
                    <span>Agregar Alimento</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Botón Agregar Nueva Comida */}
            <button
              type="button"
              onClick={handleAddMeal}
              className="w-full py-3.5 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-900/40 hover:bg-emerald-500/5 rounded-3xl flex items-center justify-center gap-2 text-slate-300 hover:text-emerald-400 font-bold text-xs transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Agregar Nueva Comida / Tiempo de Comida</span>
            </button>
          </div>

          {/* Recomendaciones del Coach */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Consejos y Recomendaciones del Coach
              </h4>
              <button
                type="button"
                onClick={handleAddRecommendation}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Consejo
              </button>
            </div>

            <div className="space-y-2">
              {(currentPlan.recomendaciones || []).map((rec, rIdx) => (
                <div key={rIdx} className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-emerald-400 font-bold">•</span>
                  <input
                    type="text"
                    value={rec}
                    onChange={(e) => handleUpdateRecommendation(rIdx, e.target.value)}
                    className="bg-transparent text-xs text-slate-200 focus:outline-none flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteRecommendation(rIdx)}
                    className="text-slate-600 hover:text-rose-400 p-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: GENERADOR DE DIETA CON IA & VOZ */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  Generador de Dietas Inteligente (Auto-Balancer)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Diseña planes con balance matemático exacto y dictado por voz.
                </p>
              </div>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGeneratePlan} className="p-6 overflow-y-auto space-y-4">
              {/* Selector de Alumno */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Alumno Destinatario (Opcional)</label>
                <select
                  value={genForm.cliente_id}
                  onChange={(e) => handleSelectCliente(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">— Ninguno (Plantilla General) —</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      👤 {c.nombre} ({c.objetivo || "Hipertrofia"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dictado por Voz */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-indigo-400" /> Dictado por Voz / Instrucciones Específicas
                  </label>
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      isRecording
                        ? "bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/30"
                        : "bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30"
                    }`}
                  >
                    {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {isRecording ? "Detener Grabación" : "Grabar Voz"}
                  </button>
                </div>

                <textarea
                  rows={2}
                  value={genForm.comando_voz}
                  onChange={(e) => setGenForm({ ...genForm, comando_voz: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder={
                    isTranscribing
                      ? "Transcribiendo audio con Whisper..."
                      : "Ej: 'Desayuno con huevos y avena, almuerzo con pechuga y arroz, merienda con fruta y yogur, y cena ligera...'"
                  }
                />
              </div>

              {/* Parámetros de Macros */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Calorías (kcal)</span>
                  <input
                    type="number"
                    value={genForm.calorias}
                    onChange={(e) => setGenForm({ ...genForm, calorias: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-black text-white focus:outline-none focus:border-emerald-500 mt-1"
                  />
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-emerald-400 uppercase">Proteína (g)</span>
                  <input
                    type="number"
                    value={genForm.proteinas}
                    onChange={(e) => setGenForm({ ...genForm, proteinas: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 mt-1"
                  />
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-sky-400 uppercase">Carbohidratos (g)</span>
                  <input
                    type="number"
                    value={genForm.carbohidratos}
                    onChange={(e) => setGenForm({ ...genForm, carbohidratos: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-sky-400 focus:outline-none focus:border-emerald-500 mt-1"
                  />
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-amber-400 uppercase">Grasas (g)</span>
                  <input
                    type="number"
                    value={genForm.grasas}
                    onChange={(e) => setGenForm({ ...genForm, grasas: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-amber-400 focus:outline-none focus:border-emerald-500 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Número de Comidas</label>
                  <select
                    value={genForm.numero_comidas}
                    onChange={(e) => setGenForm({ ...genForm, numero_comidas: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={3}>3 Comidas (Desayuno, Almuerzo, Cena)</option>
                    <option value={4}>4 Comidas (+ Merienda / Pre-Entreno)</option>
                    <option value={5}>5 Comidas (+ Media Mañana y Tarde)</option>
                    <option value={6}>6 Comidas (Alta Frecuencia)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Objetivo</label>
                  <select
                    value={genForm.objetivo}
                    onChange={(e) => setGenForm({ ...genForm, objetivo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Hipertrofia">🎯 Hipertrofia (Superávit)</option>
                    <option value="Pérdida de Grasa">🔥 Pérdida de Grasa (Déficit)</option>
                    <option value="Salud">❤️ Salud / Recomposición</option>
                    <option value="Fuerza">⚡ Rendimiento / Fuerza</option>
                  </select>
                </div>
              </div>

              {/* Botón de Envío */}
              <div className="pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isGenerating ? (generationStep || "Generando Plan...") : "Generar Plan Nutricional"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CALCULADORA TDEE & METAS NUTRICIONALES EN TIEMPO REAL */}
      {isCalculatorOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    Calculadora Metabólica en Tiempo Real
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Ajuste reactivo instantáneo de TDEE, BMR y macros por gramo de peso.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowFormulaModal(true)}
                  className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Ver explicación de fórmulas"
                >
                  ℹ️ ¿Cómo se calcula?
                </button>
                <button
                  onClick={() => setIsCalculatorOpen(false)}
                  className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Indicador Dinámico de Fórmula Activa en Tiempo Real */}
              <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between transition-all ${
                tdeeForm.conoce_grasa && parseFloat(tdeeForm.porcentaje_grasa) >= 3
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-sky-500/10 border-sky-500/30 text-sky-300"
              }`}>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold">
                    {tdeeForm.conoce_grasa && parseFloat(tdeeForm.porcentaje_grasa) >= 3
                      ? `🟢 Katch-McArdle Activa (${tdeeForm.porcentaje_grasa}% Grasa)`
                      : `🔵 Mifflin-St Jeor Activa (${tdeeForm.genero === "femenino" ? "Mujer -161" : "Hombre +5"})`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {tdeeForm.conoce_grasa && liveTdeeResult?.masa_magra_kg && (
                    <span className="text-[10px] bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                      Masa Magra: <strong>{liveTdeeResult.masa_magra_kg} kg</strong>
                    </span>
                  )}
                  <span className="text-[10px] bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-mono text-slate-400">
                    BMR: {liveTdeeResult.bmr} kcal
                  </span>
                </div>
              </div>

              {/* Bloque 1: Biometría */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="250"
                    value={tdeeForm.peso_kg}
                    onChange={(e) => setTdeeForm({ ...tdeeForm, peso_kg: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Altura (cm)</label>
                  <input
                    type="number"
                    min="100"
                    max="230"
                    value={tdeeForm.altura_cm}
                    onChange={(e) => setTdeeForm({ ...tdeeForm, altura_cm: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Edad (años)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={tdeeForm.edad}
                    onChange={(e) => setTdeeForm({ ...tdeeForm, edad: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Género</label>
                  <select
                    value={tdeeForm.genero}
                    onChange={(e) => setTdeeForm({ ...tdeeForm, genero: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="masculino">Masculino (+5)</option>
                    <option value="femenino">Femenino (-161)</option>
                  </select>
                </div>
              </div>

              {/* Bloque 2: % Grasa Corporal con Slider */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                    <input
                      type="checkbox"
                      checked={tdeeForm.conoce_grasa}
                      onChange={(e) => setTdeeForm({ ...tdeeForm, conoce_grasa: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                    />
                    <span>¿Conoces el % de grasa corporal? (Katch-McArdle)</span>
                  </label>
                  {tdeeForm.conoce_grasa && (
                    <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                      {tdeeForm.porcentaje_grasa}% Grasa
                    </span>
                  )}
                </div>

                {tdeeForm.conoce_grasa && (
                  <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                    <input
                      type="range"
                      min="5"
                      max="45"
                      step="0.5"
                      value={tdeeForm.porcentaje_grasa}
                      onChange={(e) => setTdeeForm({ ...tdeeForm, porcentaje_grasa: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>5% (Atleta seco)</span>
                      <span>15% (Atlético)</span>
                      <span>25% (Medio)</span>
                      <span>40%+ (Sobrepeso)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bloque 3: Slider de Nivel de Actividad (NEAT) */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-300">Nivel de Actividad Física (NEAT / PAL)</label>
                  <span className="font-extrabold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-lg border border-sky-500/20">
                    {FACTORES_ACTIVIDAD[tdeeForm.nivel_actividad]?.label.split(" (")[0]} (x{FACTORES_ACTIVIDAD[tdeeForm.nivel_actividad]?.factor})
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={["sedentario", "ligero", "moderado", "intenso", "muy_intenso"].indexOf(tdeeForm.nivel_actividad)}
                  onChange={(e) => {
                    const keys = ["sedentario", "ligero", "moderado", "intenso", "muy_intenso"];
                    setTdeeForm({ ...tdeeForm, nivel_actividad: keys[parseInt(e.target.value)] });
                  }}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
                <p className="text-[11px] text-slate-400">
                  💡 {FACTORES_ACTIVIDAD[tdeeForm.nivel_actividad]?.desc}
                </p>
              </div>

              {/* Bloque 4: Objetivo y Slider de Ritmo / Agresividad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Objetivo Físico</label>
                  <select
                    value={tdeeForm.objetivo}
                    onChange={(e) => {
                      const nuevoObj = e.target.value;
                      const protDefault = nuevoObj.includes("Pérdida") ? 2.3 : nuevoObj.includes("Hipertrofia") ? 2.0 : 1.8;
                      setTdeeForm({ ...tdeeForm, objetivo: nuevoObj, proteina_g_kg: protDefault });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="Hipertrofia">🎯 Hipertrofia (Superávit)</option>
                    <option value="Pérdida de Grasa">🔥 Pérdida de Grasa (Déficit)</option>
                    <option value="Fuerza">⚡ Rendimiento / Fuerza</option>
                    <option value="Salud">❤️ Mantenimiento Calórico</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <label className="font-bold text-slate-300">Ritmo / Agresividad</label>
                    <span className="font-bold text-indigo-400">
                      {RITMOS_AJUSTE[tdeeForm.ritmo]?.label}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="1"
                    value={["conservador", "moderado", "agresivo"].indexOf(tdeeForm.ritmo)}
                    onChange={(e) => {
                      const keys = ["conservador", "moderado", "agresivo"];
                      setTdeeForm({ ...tdeeForm, ritmo: keys[parseInt(e.target.value)] });
                    }}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {RITMOS_AJUSTE[tdeeForm.ritmo]?.desc}
                  </p>
                </div>
              </div>

              {/* Bloque 5: Sliders de Macros Reactivos (Proteína y Grasas) */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                    ⚙️ Ajuste Fino de Macros (Sliders)
                  </h4>
                  <span className="text-[10px] text-slate-400">Carbohidratos auto-balanceados al 100%</span>
                </div>

                {/* Slider Proteína */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-emerald-400">🥩 Proteína por kg de peso</span>
                    <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {liveTdeeResult.proteina_g_kg} g/kg ({liveTdeeResult.proteinas}g)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.6"
                    max="2.8"
                    step="0.1"
                    value={tdeeForm.proteina_g_kg}
                    onChange={(e) => setTdeeForm({ ...tdeeForm, proteina_g_kg: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Slider Grasas */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-amber-400">🥑 Grasas (% del total calórico)</span>
                    <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {liveTdeeResult.grasa_pct}% ({liveTdeeResult.grasas}g)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.15"
                    max="0.35"
                    step="0.01"
                    value={tdeeForm.grasa_pct}
                    onChange={(e) => setTdeeForm({ ...tdeeForm, grasa_pct: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>

              {/* Bloque 6: RESULTADO EN VIVO REACTIVO */}
              <div className="bg-slate-950 border border-sky-500/30 rounded-2xl p-4 space-y-3.5 shadow-xl">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-900">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Gasto de Mantenimiento</span>
                    <div className="text-sm font-black text-slate-300">
                      {liveTdeeResult.tdee} <span className="text-[10px] font-normal text-slate-500">kcal/día</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold block">Calorías Objetivo</span>
                    <div className="text-2xl font-black text-emerald-400">
                      {liveTdeeResult.calorias} <span className="text-xs font-normal text-slate-400">kcal</span>
                    </div>
                    <span className={`text-[10px] font-bold ${liveTdeeResult.diferencia_tdee >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                      {liveTdeeResult.diferencia_tdee > 0 ? `+${liveTdeeResult.diferencia_tdee} kcal (Superávit)` : liveTdeeResult.diferencia_tdee < 0 ? `${liveTdeeResult.diferencia_tdee} kcal (Déficit)` : "Mantenimiento exacto"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-emerald-400 font-bold block">🥩 Proteína</span>
                    <div className="font-extrabold text-white text-base mt-0.5">{liveTdeeResult.proteinas}g</div>
                    <span className="text-[9px] text-slate-500">{liveTdeeResult.proteina_g_kg} g/kg</span>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-sky-400 font-bold block">🍚 Carbos</span>
                    <div className="font-extrabold text-white text-base mt-0.5">{liveTdeeResult.carbohidratos}g</div>
                    <span className="text-[9px] text-slate-500">{Math.round((liveTdeeResult.carbohidratos * 4 / liveTdeeResult.calorias) * 100)}% kcal</span>
                  </div>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-amber-400 font-bold block">🥑 Grasas</span>
                    <div className="font-extrabold text-white text-base mt-0.5">{liveTdeeResult.grasas}g</div>
                    <span className="text-[9px] text-slate-500">{liveTdeeResult.grasa_pct}% kcal</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyTDEEToGenerator}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  👉 Aplicar Metas al Generador de Dietas (Auto-Balancer)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EXPLICACIÓN DE FÓRMULAS & METODOLOGÍA CIENTÍFICA */}
      {showFormulaModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                  🧪
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Metodología & Fórmulas Energéticas</h3>
                  <p className="text-xs text-slate-400">Ciencia deportiva aplicada al cálculo calórico y macronutrientes.</p>
                </div>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
              {/* Sección 1: Katch-McArdle */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-emerald-400 text-sm">1. Fórmula Katch-McArdle (% de Grasa Conocido)</h4>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded">Máxima Precisión</span>
                </div>
                <p>
                  <strong>¿Cuándo se usa?</strong> Cuando el atleta conoce su <strong>% de grasa corporal</strong> (pliegues, bioimpedancia o DXA).
                </p>
                <div className="bg-slate-900 p-3 rounded-xl font-mono text-[11px] text-slate-200 border border-slate-800">
                  Masa Magra (kg) = Peso × (1 - %Grasa / 100)<br />
                  BMR = 370 + (21.6 × Masa Magra)
                </div>
                <p className="text-slate-400 text-[11px]">
                  <strong>¿Por qué es superior?</strong> El tejido adiposo es metabólicamente inactivo; el músculo es el motor que consume las calorías. Por ello, esta fórmula es neutral respecto al género y calcula exactamente la energía que demanda la masa magra real.
                </p>
              </div>

              {/* Sección 2: Mifflin-St Jeor */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-sky-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sky-400 text-sm">2. Fórmula Mifflin-St Jeor (Clínica por Género)</h4>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 font-bold px-2 py-0.5 rounded">Estándar Clínico</span>
                </div>
                <p>
                  <strong>¿Cuándo se usa?</strong> Cuando <strong>no se conoce el % de grasa</strong>. Requiere Peso, Altura, Edad y Género biológico.
                </p>
                <div className="bg-slate-900 p-3 rounded-xl font-mono text-[11px] text-slate-200 border border-slate-800 space-y-1">
                  <div>Hombre: BMR = (10 × peso) + (6.25 × altura) - (5 × edad) + 5</div>
                  <div>Mujer: BMR = (10 × peso) + (6.25 × altura) - (5 × edad) - 161</div>
                </div>
                <p className="text-slate-400 text-[11px]">
                  <strong>¿Por qué la diferencia por género?</strong> A igual peso y altura, las mujeres poseen fisiológicamente una mayor proporción de grasa esencial y menor masa esquelética que los hombres, lo que representa la constante de ajuste (-161 vs +5).
                </p>
              </div>

              {/* Sección 3: Factores de Actividad */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-extrabold text-amber-400 text-sm">3. Gasto Energético Diario (TDEE = BMR × NEAT)</h4>
                <p>
                  El BMR es el gasto en reposo absoluto. Se multiplica por el factor de actividad física:
                </p>
                <ul className="space-y-1 text-slate-400 text-[11px] list-disc list-inside">
                  <li><strong>Sedentario (x1.2):</strong> Trabajo de oficina, poco o ningún ejercicio.</li>
                  <li><strong>Ligero (x1.375):</strong> Entrenamiento 1 a 3 días por semana.</li>
                  <li><strong>Moderado (x1.55):</strong> Entrenamiento 3 a 5 días por semana.</li>
                  <li><strong>Intenso (x1.725):</strong> Entrenamiento 6 a 7 días o trabajo físico activo.</li>
                  <li><strong>Atleta (x1.9):</strong> Doble sesión de entrenamiento diaria.</li>
                </ul>
              </div>

              {/* Sección 4: Distribución de Macros */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-extrabold text-indigo-400 text-sm">4. Reparto Óptimo de Macronutrientes</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="bg-slate-900 p-2 rounded-xl">
                    <span className="font-bold text-emerald-400 block">Proteína</span>
                    <span className="text-slate-300">2.0 - 2.4 g/kg</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl">
                    <span className="font-bold text-amber-400 block">Grasas</span>
                    <span className="text-slate-300">0.85 - 1.0 g/kg</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl">
                    <span className="font-bold text-sky-400 block">Carbohidratos</span>
                    <span className="text-slate-300">Remanente</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-5 py-2 rounded-xl transition-colors"
              >
                Cerrar Explicación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BUSCADOR Y SELECTOR DE ALIMENTOS */}
      {foodPickerState.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  🍎
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    Agregar Alimento a {currentPlan?.comidas[foodPickerState.cIdx]?.nombre || "Comida"}
                  </h3>
                  <p className="text-xs text-slate-400">Selecciona del catálogo verificado o crea un ingrediente a medida.</p>
                </div>
              </div>
              <button
                onClick={() => setFoodPickerState({ isOpen: false, cIdx: null, query: "", categoria: "" })}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle Modo Catálogo vs Personalizado */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex gap-2">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  !isCustomMode
                    ? "bg-emerald-600 text-white shadow"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                📚 Catálogo de Alimentos ({CATALOGO_ALIMENTOS.length})
              </button>
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  isCustomMode
                    ? "bg-emerald-600 text-white shadow"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                ✏️ Crear Alimento Personalizado
              </button>
            </div>

            {/* Modo 1: Catálogo con Buscador */}
            {!isCustomMode ? (
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={foodPickerState.query}
                    onChange={(e) => setFoodPickerState({ ...foodPickerState, query: e.target.value })}
                    placeholder="Buscar alimento (ej: Pechuga, Arroz, Avena, Huevo, Aguacate)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>

                {/* Categorías */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  {["", "proteina", "carbohidrato", "grasa", "vegetal", "fruta"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFoodPickerState({ ...foodPickerState, categoria: cat })}
                      className={`px-3 py-1 rounded-lg capitalize whitespace-nowrap font-bold transition-colors ${
                        foodPickerState.categoria === cat
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                      }`}
                    >
                      {cat || "Todos"}
                    </button>
                  ))}
                </div>

                {/* Lista de Alimentos */}
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {buscarAlimentos(foodPickerState.query, foodPickerState.categoria).map((food) => (
                    <div
                      key={food.id}
                      onClick={() => handleSelectFoodFromPicker(food)}
                      className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-white text-xs group-hover:text-emerald-300 transition-colors">
                            {food.nombre}
                          </h4>
                          <span className="text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 capitalize">
                            {food.categoria?.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-[10px] text-slate-400 mt-1 font-mono">
                          <span className="text-slate-300 font-bold">{food.kcal_por_100} kcal/100g</span>
                          <span className="text-emerald-400 font-semibold">{food.prot_por_100}g P</span>
                          <span className="text-sky-400 font-semibold">{food.carbs_por_100}g C</span>
                          <span className="text-amber-400 font-semibold">{food.grasa_por_100}g G</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="bg-emerald-600/10 group-hover:bg-emerald-600 text-emerald-400 group-hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/20 transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar
                      </button>
                    </div>
                  ))}

                  {buscarAlimentos(foodPickerState.query, foodPickerState.categoria).length === 0 && (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No encontramos alimentos para esa búsqueda. Puedes crear un ingrediente a medida en la pestaña superior.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Modo 2: Crear Alimento Personalizado */
              <form onSubmit={handleAddCustomFood} className="p-5 overflow-y-auto space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nombre del Alimento *</label>
                  <input
                    type="text"
                    required
                    value={customFoodForm.nombre}
                    onChange={(e) => setCustomFoodForm({ ...customFoodForm, nombre: e.target.value })}
                    placeholder="Ej: Batido de Proteína Isolate con Mantequilla de Maní"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Porción a Agregar (g) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={customFoodForm.cantidad}
                      onChange={(e) => setCustomFoodForm({ ...customFoodForm, cantidad: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Texto de Porción (Opcional)</label>
                    <input
                      type="text"
                      value={customFoodForm.unidad_texto}
                      onChange={(e) => setCustomFoodForm({ ...customFoodForm, unidad_texto: e.target.value })}
                      placeholder="Ej: 1 scoop (35g)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">
                    Valores Nutricionales (por 100g):
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Kcal</label>
                      <input
                        type="number"
                        value={customFoodForm.kcal_por_100}
                        onChange={(e) => setCustomFoodForm({ ...customFoodForm, kcal_por_100: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-emerald-400 font-bold mb-0.5">Prot (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={customFoodForm.prot_por_100}
                        onChange={(e) => setCustomFoodForm({ ...customFoodForm, prot_por_100: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-sky-400 font-bold mb-0.5">Carbs (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={customFoodForm.carbs_por_100}
                        onChange={(e) => setCustomFoodForm({ ...customFoodForm, carbs_por_100: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-amber-400 font-bold mb-0.5">Grasa (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={customFoodForm.grasa_por_100}
                        onChange={(e) => setCustomFoodForm({ ...customFoodForm, grasa_por_100: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Agregar Ingrediente a la Comida
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
