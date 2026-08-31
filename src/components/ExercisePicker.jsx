"use client";
import { useState } from "react";
import { Search, Filter, Dumbbell, Award, X, Check } from "lucide-react";

export default function ExercisePicker({ ejerciciosGlobales, ejerciciosCoach, onSelect, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMusculo, setSelectedMusculo] = useState("TODOS");

  // 1. Desduplicar y fusionar ejercicios
  const misEjerciciosDepurados = Object.values(
    (ejerciciosCoach || []).reduce((acc, ej) => {
      const key = (ej.nombre || ej.nombre_ejercicio || "").toLowerCase().trim();
      if (!key) return acc;
      if (!acc[key] || (!acc[key].video_demo_url && ej.video_demo_url)) {
        acc[key] = { ...ej, es_coach: true };
      }
      return acc;
    }, {})
  );

  const getNormName = (item) => (item.nombre_ejercicio || item.nombre || "").toLowerCase().trim();

  const todosLosEjercicios = [
    ...misEjerciciosDepurados,
    ...(ejerciciosGlobales || [])
      .filter((g) => !misEjerciciosDepurados.some((m) => getNormName(m) === getNormName(g)))
      .map((g) => ({ ...g, es_coach: false }))
  ].sort((a, b) => (a.nombre_ejercicio || a.nombre || "").localeCompare(b.nombre_ejercicio || b.nombre || "", "es"));

  // Extraer grupos musculares
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

  const filtrados = todosLosEjercicios.filter((ej) => {
    const nombre = ej.nombre_ejercicio || ej.nombre || "";
    const musculo = (ej.musculos_principales || ej.grupo_muscular || "").toLowerCase();

    const coincideBusqueda = nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const coincideMusculo =
      selectedMusculo === "TODOS" || musculo.includes(selectedMusculo.toLowerCase());

    return coincideBusqueda && coincideMusculo;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-indigo-400" /> Seleccionar Ejercicio del Banco
            </h3>
            <p className="text-xs text-slate-400">
              Haz clic en un ejercicio para agregarlo a la sesión.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros */}
        <div className="p-3 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="relative sm:w-48">
            <Filter className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <select
              value={selectedMusculo}
              onChange={(e) => setSelectedMusculo(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              {gruposMusculares.map((m) => (
                <option key={m} value={m}>
                  {m === "TODOS" ? "Todos los Músculos" : m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid de Ejercicios */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filtrados.length > 0 ? (
            filtrados.map((ej) => {
              const nombre = ej.nombre_ejercicio || ej.nombre;
              const musculos = ej.musculos_principales || ej.grupo_muscular || "General";
              const tieneVideo = !!ej.video_demo_url;
              const thumbnail = ej.thumbnail_url || ej.preview_url_webp;

              return (
                <div
                  key={ej.id || ej.slug}
                  onClick={() => onSelect(ej)}
                  className={`p-3 rounded-xl border bg-slate-950 hover:border-indigo-500 transition-all cursor-pointer flex gap-3 items-center group relative ${
                    tieneVideo ? "border-amber-500/40" : "border-slate-800"
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center border border-slate-800">
                    {thumbnail ? (
                      <img src={thumbnail} alt={nombre} className="w-full h-full object-cover" />
                    ) : (
                      <Dumbbell className="w-5 h-5 text-slate-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {tieneVideo && (
                      <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded inline-flex items-center gap-1 mb-0.5 border border-amber-500/20">
                        <Award className="w-2.5 h-2.5" /> SUBIDO 🏅
                      </span>
                    )}
                    <h4 className="text-xs font-bold text-slate-100 truncate group-hover:text-indigo-400 transition-colors">
                      {nombre}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">{musculos}</p>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-slate-500 text-xs">
              No se encontraron ejercicios.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
