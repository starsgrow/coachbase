"use client";
import { useState, useEffect } from "react";
import { Search, Play, Dumbbell, Plus, Sparkles, Award, Eye, EyeOff, Filter } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import ExerciseCreator from "@/components/ExerciseCreator";
import ExerciseDetailModal from "@/components/ExerciseDetailModal";

// Componente para manejar miniaturas con reintento automático mientras el CDN transcodifica
function ExerciseThumbnail({ src, alt }) {
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (hasError && retryCount < 6) {
      const timer = setTimeout(() => {
        setHasError(false);
        setRetryCount((prev) => prev + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasError, retryCount]);

  if (!src || (hasError && retryCount >= 6)) {
    return (
      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-700 p-2">
        <Dumbbell className="w-9 h-9 opacity-60 mb-1" />
        <span className="text-[10px] font-medium text-slate-500">Demostración</span>
      </div>
    );
  }

  const imageUrl = retryCount > 0 ? `${src}?r=${retryCount}` : src;

  return (
    <img
      src={imageUrl}
      alt={alt}
      onError={() => setHasError(true)}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    />
  );
}

// Función auxiliar para normalizar nombres y evitar cualquier duplicado
const getNormName = (item) =>
  (item.nombre_ejercicio || item.nombre || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default function EjerciciosManager({ ejerciciosGlobales, ejerciciosCoach, coachId }) {
  const [filterTab, setFilterTab] = useState("todos"); // 'todos' | 'coach' | 'porsubir'
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMusculo, setSelectedMusculo] = useState("TODOS");
  const [misEjercicios, setMisEjercicios] = useState(ejerciciosCoach || []);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedEjercicio, setSelectedEjercicio] = useState(null);

  // 1. Depurar y desduplicar ejercicios del coach por nombre normalizado
  const misEjerciciosDepurados = Object.values(
    misEjercicios.reduce((acc, ej) => {
      const key = getNormName(ej);
      if (!key) return acc;
      if (!acc[key]) {
        acc[key] = ej;
      } else {
        if (!acc[key].video_demo_url && ej.video_demo_url) {
          acc[key] = ej;
        }
      }
      return acc;
    }, {})
  );

  // 2. Unificar catálogo global + ejercicios del coach desduplicados
  const listaUnificada = [
    ...misEjerciciosDepurados.map((ej) => ({ ...ej, es_coach: true })),
    ...ejerciciosGlobales
      .filter((g) => {
        const gKey = getNormName(g);
        return !misEjerciciosDepurados.some((m) => getNormName(m) === gKey);
      })
      .map((ej) => ({ ...ej, es_coach: false }))
  ];

  // Ordenar alfabéticamente A-Z de forma natural para que el catálogo tenga orden impecable
  const todosLosEjercicios = listaUnificada.sort((a, b) => {
    const nameA = (a.nombre_ejercicio || a.nombre || "").toLowerCase();
    const nameB = (b.nombre_ejercicio || b.nombre || "").toLowerCase();
    return nameA.localeCompare(nameB, "es", { sensitivity: "base" });
  });

  // Extraer lista de grupos musculares únicos para el selector de filtro
  const gruposMusculares = [
    "TODOS",
    ...Array.from(
      new Set(
        todosLosEjercicios
          .map((e) => e.musculos_principales || e.grupo_muscular)
          .filter(Boolean)
          .map((m) => m.trim())
      )
    ).sort()
  ];

  // Filtrado según búsqueda, pestaña activa y grupo muscular
  const ejerciciosFiltrados = todosLosEjercicios.filter((ej) => {
    const nombre = ej.nombre_ejercicio || ej.nombre || "";
    const musculo = (ej.musculos_principales || ej.grupo_muscular || "").toLowerCase();

    const coincideBusqueda = nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const coincideMusculo =
      selectedMusculo === "TODOS" || musculo.includes(selectedMusculo.toLowerCase());

    if (!coincideBusqueda || !coincideMusculo) return false;

    if (filterTab === "coach") {
      return !!ej.video_demo_url;
    }

    if (filterTab === "porsubir") {
      return !ej.video_demo_url;
    }

    return true;
  });

  const countCoach = todosLosEjercicios.filter((e) => !!e.video_demo_url).length;
  const countPorSubir = todosLosEjercicios.filter((e) => !e.video_demo_url).length;

  const handleCreated = (nuevoEjercicio) => {
    setMisEjercicios((prev) => [{ ...nuevoEjercicio, es_coach: true }, ...prev]);
    setShowCreator(false);
  };

  const handleUpdated = (ejercicioActualizado) => {
    setMisEjercicios((prev) => {
      const targetKey = getNormName(ejercicioActualizado);
      const existe = prev.some((e) => getNormName(e) === targetKey || (e.id && e.id === ejercicioActualizado.id));

      if (existe) {
        return prev.map((e) => {
          const coincide = getNormName(e) === targetKey || (e.id && e.id === ejercicioActualizado.id);
          return coincide ? { ...e, ...ejercicioActualizado, es_coach: true } : e;
        });
      }
      return [{ ...ejercicioActualizado, es_coach: true }, ...prev];
    });

    setSelectedEjercicio((prev) => (prev ? { ...prev, ...ejercicioActualizado, es_coach: true } : null));
  };

  const handleToggleCardActive = async (e, ej) => {
    e.stopPropagation();
    const esActivoActual = ej.es_publico !== false && ej.es_activo !== false;
    const nuevoEstado = !esActivoActual;

    handleUpdated({
      ...ej,
      es_publico: nuevoEstado,
      es_activo: nuevoEstado
    });

    try {
      await fetchWithAuth("/api/ejercicios/visibilidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ejercicio_id: ej.id || ej.slug,
          coach_id: coachId,
          es_activo: nuevoEstado
        })
      });
    } catch (err) {
      console.error("Error al actualizar visibilidad:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar con Botón Principal */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Catálogo de Ejercicios del Coach
          </h2>
          <p className="text-xs text-slate-400">
            Gestiona la biblioteca global de ejercicios y sube tus demostraciones en video.
          </p>
        </div>

        <button
          onClick={() => setShowCreator((prev) => !prev)}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-5 h-5" /> Crear Nuevo Ejercicio
        </button>
      </div>

      {/* Creador de Ejercicios (Desplegable) */}
      {showCreator && (
        <div className="relative">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Formulario de Creación con IA
            </span>
            <button
              onClick={() => setShowCreator(false)}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Cerrar Formulario
            </button>
          </div>
          <ExerciseCreator coachId={coachId} onCreated={handleCreated} />
        </div>
      )}

      {/* Buscador + Selector de Músculo + Pestañas de Filtro */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-2xl">
        
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar ejercicio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Selector de Grupo Muscular */}
          <div className="relative sm:w-56">
            <Filter className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            <select
              value={selectedMusculo}
              onChange={(e) => setSelectedMusculo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              {gruposMusculares.map((m) => (
                <option key={m} value={m}>
                  {m === "TODOS" ? "Todos los Músculos" : m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 Pestañas de Filtro */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold shrink-0">
          <button
            onClick={() => setFilterTab("todos")}
            className={`px-3.5 py-2 rounded-lg transition-all ${
              filterTab === "todos"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Todos ({todosLosEjercicios.length})
          </button>

          <button
            onClick={() => setFilterTab("coach")}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all ${
              filterTab === "coach"
                ? "bg-amber-500 text-slate-950 font-black shadow"
                : "text-slate-400 hover:text-amber-400"
            }`}
          >
            <Award className="w-3.5 h-3.5 text-slate-950" /> Subidos por el Coach 🏅 ({countCoach})
          </button>

          <button
            onClick={() => setFilterTab("porsubir")}
            className={`px-3.5 py-2 rounded-lg transition-all ${
              filterTab === "porsubir"
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Por Subir ({countPorSubir})
          </button>
        </div>
      </div>

      {/* Grid de Ejercicios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {ejerciciosFiltrados.length > 0 ? (
          ejerciciosFiltrados.map((ej, index) => {
            const nombre = ej.nombre_ejercicio || ej.nombre;
            const musculos = ej.musculos_principales || ej.grupo_muscular || "General";
            const thumbnail = ej.thumbnail_url || ej.preview_url_webp;
            
            const tieneVideoCoach = !!ej.video_demo_url;
            const esActivo = ej.es_publico !== false && ej.es_activo !== false;

            const cardKey = ej.id
              ? `coach-${ej.id}`
              : `global-${ej.slug || 'ej'}-${index}`;

            return (
              <div
                key={cardKey}
                onClick={() => setSelectedEjercicio(ej)}
                className={`bg-slate-900 border rounded-2xl overflow-hidden hover:border-slate-500 transition-all cursor-pointer group relative flex flex-col aspect-square justify-between shadow-lg ${
                  tieneVideoCoach ? "border-amber-500/60 shadow-amber-500/10" : "border-slate-800"
                } ${!esActivo ? "opacity-40 grayscale-[60%]" : ""}`}
              >
                {/* Header superior flotante con Bandita Dorada "SUBIDO 🏅" e Interruptor ON/OFF */}
                <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-1 pointer-events-none">
                  {tieneVideoCoach ? (
                    <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xl border border-yellow-200/60 pointer-events-auto">
                      <Award className="w-3.5 h-3.5" /> SUBIDO 🏅
                    </div>
                  ) : (
                    <span />
                  )}

                  <button
                    onClick={(e) => handleToggleCardActive(e, ej)}
                    title={esActivo ? "Ejercicio activo en la app" : "Ejercicio oculto en la app"}
                    className={`p-2 rounded-xl border backdrop-blur shadow-xl transition-all pointer-events-auto ${
                      esActivo
                        ? "bg-slate-900/90 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                        : "bg-slate-950/90 border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white"
                    }`}
                  >
                    {esActivo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>

                {/* Zona de Miniatura (58% de alto) */}
                <div className="h-[58%] w-full bg-slate-950 relative flex items-center justify-center overflow-hidden">
                  <ExerciseThumbnail src={thumbnail} alt={nombre} />

                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-9 h-9 text-white drop-shadow-md" />
                  </div>
                </div>

                {/* Zona de Información de la Tarjeta (42% de alto) */}
                <div className="p-3 h-[42%] flex flex-col justify-between bg-slate-900/95">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded inline-block mb-1 truncate max-w-full">
                      {musculos}
                    </span>
                    <h4 className="font-bold text-slate-100 text-xs line-clamp-2 group-hover:text-indigo-400 transition-colors leading-snug">
                      {nombre}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span className="truncate max-w-[100px]">
                      {Array.isArray(ej.equipamiento_necesario)
                        ? ej.equipamiento_necesario[0]
                        : (ej.equipamiento || "General")}
                    </span>
                    <span className="text-indigo-400 font-bold hover:underline shrink-0">
                      Ver Ficha →
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800 space-y-3">
            <Dumbbell className="w-10 h-10 mx-auto opacity-40 text-indigo-400" />
            <p className="text-sm font-medium text-slate-300">
              No se encontraron ejercicios en este filtro.
            </p>
          </div>
        )}
      </div>

      {/* Modal de Detalle de Ejercicio */}
      {selectedEjercicio && (
        <ExerciseDetailModal
          ejercicio={selectedEjercicio}
          coachId={coachId}
          onClose={() => setSelectedEjercicio(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
