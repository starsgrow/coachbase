"use client";
import { useState, useRef } from "react";
import * as tus from "tus-js-client";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { UploadCloud, CheckCircle2, AlertTriangle, Dumbbell, Sparkles, Film, X, Loader2, Info } from "lucide-react";

export default function ExerciseCreator({ coachId, onCreated }) {
  const [formData, setFormData] = useState({
    nombre: "",
    grupo_muscular: "Pecho",
    musculos_secundarios: [],
    equipamiento: "Mancuernas",
    dificultad: ["Principiante", "Intermedio"],
    descripcion: "",
    beneficios: [],
    errores_comunes: [],
    nombres_comunes: ""
  });

  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [analyzingVideo, setAnalyzingVideo] = useState(false);
  const [hasWatermark, setHasWatermark] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isError, setIsError] = useState(false);

  // Estados para desambiguación y duplicados
  const [sugerenciasAmbiguas, setSugerenciasAmbiguas] = useState([]);
  const [ejercicioDuplicado, setEjercicioDuplicado] = useState(null);

  const fileInputRef = useRef(null);

  // Extractor de fotogramas clave en el cliente usando HTML5 Canvas
  const extractVideoFrames = (videoFile) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(videoFile);
      video.src = url;

      video.onloadedmetadata = async () => {
        const duration = video.duration || 5;
        const midTime = duration * 0.5;
        const lastTime = Math.max(0.1, duration - 0.5);

        const captureFrameAt = (time) => {
          return new Promise((res) => {
            video.currentTime = time;
            video.onseeked = () => {
              const canvas = document.createElement("canvas");
              const maxDim = 512;
              let w = video.videoWidth || 640;
              let h = video.videoHeight || 360;
              if (w > maxDim || h > maxDim) {
                if (w > h) {
                  h = Math.round((h * maxDim) / w);
                  w = maxDim;
                } else {
                  w = Math.round((w * maxDim) / h);
                  h = maxDim;
                }
              }
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(video, 0, 0, w, h);
              res(canvas.toDataURL("image/jpeg", 0.8));
            };
          });
        };

        try {
          const imageMid = await captureFrameAt(midTime);
          const imageLast = await captureFrameAt(lastTime);
          URL.revokeObjectURL(url);
          resolve({ imageMid, imageLast, duration });
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo leer el archivo de video."));
      };
    });
  };

  const handleAnalyzeVideo = async (targetFile) => {
    const videoToAnalyze = targetFile || file;
    if (!videoToAnalyze) return;

    setAnalyzingVideo(true);
    setIsError(false);
    setStatusMessage("👁️ Extrayendo fotogramas y analizando biomecánica del video con IA...");

    try {
      const { imageMid, imageLast, duration } = await extractVideoFrames(videoToAnalyze);

      const res = await fetchWithAuth("/api/ejercicios/ia-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageMid, imageLast, duration, coach_id: coachId })
      });

      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Error al analizar el video con IA");

      const datos = result.datos;
      const parsedDificultad = Array.isArray(datos.dificultad) && datos.dificultad.length > 0
        ? datos.dificultad
        : (typeof datos.dificultad === "string" ? datos.dificultad.split(",").map(s => s.trim()) : ["Intermedio"]);

      setFormData((prev) => ({
        ...prev,
        nombre: datos.nombre_ejercicio || prev.nombre,
        grupo_muscular: datos.grupo_muscular || prev.grupo_muscular,
        musculos_secundarios: Array.isArray(datos.musculos_secundarios) ? datos.musculos_secundarios : prev.musculos_secundarios,
        equipamiento: datos.equipamiento || prev.equipamiento,
        dificultad: parsedDificultad,
        descripcion: datos.descripcion || prev.descripcion,
        beneficios: Array.isArray(datos.beneficios) ? datos.beneficios : prev.beneficios,
        errores_comunes: Array.isArray(datos.errores_comunes) ? datos.errores_comunes : prev.errores_comunes,
        nombres_comunes: Array.isArray(datos.nombres_comunes)
          ? datos.nombres_comunes.join(", ")
          : (datos.nombres_comunes || "")
      }));

      setHasWatermark(Boolean(datos.tiene_logo_final));

      if (result.existeDuplicado && result.coincidenciaExacta) {
        setEjercicioDuplicado(result.coincidenciaExacta);
        setStatusMessage(`✨ Video reconocido: "${datos.nombre_ejercicio}". Ya existe en tu catálogo.`);
      } else {
        setStatusMessage(`✨ Video reconocido con éxito: "${datos.nombre_ejercicio}"`);
      }
    } catch (err) {
      console.error("Error en visión de video:", err);
      setIsError(true);
      setStatusMessage("No se pudo analizar el video con IA: " + err.message);
    } finally {
      setAnalyzingVideo(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("video/")) {
      setFile(droppedFile);
      if (!formData.nombre.trim()) {
        handleAnalyzeVideo(droppedFile);
      }
    }
  };

  const handleAutocompleteAI = async (nombreEspecifico = null) => {
    const targetNombre = typeof nombreEspecifico === "string" ? nombreEspecifico : formData.nombre;

    if (!targetNombre || !targetNombre.trim()) {
      setIsError(true);
      setStatusMessage("Escribe el nombre del ejercicio para autocompletar con IA.");
      return;
    }

    setGeneratingAI(true);
    setIsError(false);
    setSugerenciasAmbiguas([]);
    setEjercicioDuplicado(null);
    setStatusMessage("🤖 Consultando catálogo y analizando con IA...");

    try {
      const res = await fetchWithAuth("/api/ejercicios/ia-autocompletar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: targetNombre, coach_id: coachId })
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al autocompletar");

      // 1. Caso Duplicado
      if (data.existeDuplicado) {
        setEjercicioDuplicado(data.ejercicioExistente);
        setStatusMessage(data.mensaje || "Este ejercicio ya existe en la base de datos.");
        return;
      }

      // 2. Caso Ambigüedad
      if (data.esAmbiguo) {
        setSugerenciasAmbiguas(data.sugerencias || []);
        setStatusMessage("💡 El término ingresado es genérico. Selecciona una variante específica.");
        return;
      }

      // 3. Caso Exitoso Específico
      const datosIA = data.datos;
      const parsedDificultad = Array.isArray(datosIA.dificultad) && datosIA.dificultad.length > 0
        ? datosIA.dificultad
        : (typeof datosIA.dificultad === "string" ? datosIA.dificultad.split(",").map(s => s.trim()) : ["Intermedio"]);

      setFormData((prev) => ({
        ...prev,
        nombre: datosIA.nombre_ejercicio || targetNombre,
        grupo_muscular: datosIA.grupo_muscular || prev.grupo_muscular,
        musculos_secundarios: Array.isArray(datosIA.musculos_secundarios) ? datosIA.musculos_secundarios : prev.musculos_secundarios,
        equipamiento: datosIA.equipamiento || prev.equipamiento,
        dificultad: parsedDificultad,
        descripcion: datosIA.descripcion || prev.descripcion,
        beneficios: Array.isArray(datosIA.beneficios) ? datosIA.beneficios : prev.beneficios,
        errores_comunes: Array.isArray(datosIA.errores_comunes) ? datosIA.errores_comunes : prev.errores_comunes,
        nombres_comunes: Array.isArray(datosIA.nombres_comunes)
          ? datosIA.nombres_comunes.join(", ")
          : (datosIA.nombres_comunes || "")
      }));

      setStatusMessage("✨ Ficha técnica autocompletada con Inteligencia Artificial.");
    } catch (err) {
      console.error(err);
      setIsError(true);
      setStatusMessage("No se pudo autocompletar con IA: " + err.message);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSelectSugerencia = (sugerencia) => {
    setFormData((prev) => ({ ...prev, nombre: sugerencia }));
    handleAutocompleteAI(sugerencia);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;

    setUploading(true);
    setIsError(false);
    setStatusMessage("Procesando ejercicio...");

    try {
      let bunnyVideoId = null;

      if (file) {
        setStatusMessage("Obteniendo slot seguro de subida...");

        const slotRes = await fetchWithAuth("/api/ejercicios/slot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titulo: formData.nombre, coach_id: coachId })
        });

        const slotData = await slotRes.json();
        if (!slotRes.ok || slotData.error) throw new Error(slotData.error || "Error al obtener slot");

        const { bunnyVideoId: vidId, libraryId, authSignature, expirationTime } = slotData;
        bunnyVideoId = vidId;

        setStatusMessage("Subiendo demostración de video en alta definición...");

        await new Promise((resolve, reject) => {
          const upload = new tus.Upload(file, {
            endpoint: "https://video.bunnycdn.com/tusupload",
            retryDelays: [0, 3000, 5000, 10000],
            headers: {
              AuthorizationSignature: authSignature,
              AuthorizationExpire: expirationTime.toString(),
              VideoId: bunnyVideoId,
              LibraryId: libraryId
            },
            metadata: {
              filetype: file.type,
              title: formData.nombre
            },
            onError: (err) => {
              reject(new Error("Error en la subida del video: " + err.message));
            },
            onProgress: (bytesUploaded, bytesTotal) => {
              const pct = Math.round((bytesUploaded / bytesTotal) * 100);
              setProgress(pct);
            },
            onSuccess: () => {
              resolve();
            }
          });
          upload.start();
        });
      }

      setStatusMessage("Guardando ejercicio en la base de datos...");

      const saveRes = await fetchWithAuth("/api/ejercicios/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          dificultad: Array.isArray(formData.dificultad) ? formData.dificultad.join(", ") : (formData.dificultad || "Intermedio"),
          coach_id: coachId,
          bunny_video_id: bunnyVideoId
        })
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok || saveData.error) throw new Error(saveData.error || "Error al guardar el ejercicio");

      setUploading(false);
      setProgress(100);
      setStatusMessage("¡Ejercicio creado y guardado con éxito!");

      setFormData({
        nombre: "",
        grupo_muscular: "Pecho",
        musculos_secundarios: [],
        equipamiento: "Mancuernas",
        dificultad: ["Principiante", "Intermedio"],
        descripcion: "",
        beneficios: [],
        errores_comunes: [],
        nombres_comunes: ""
      });
      setFile(null);
      setSugerenciasAmbiguas([]);
      setEjercicioDuplicado(null);

      if (onCreated && saveData.ejercicio) {
        onCreated(saveData.ejercicio);
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
      setStatusMessage(err.message || "Ocurrió un error inesperado");
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5 text-indigo-400" /> Creador de Ejercicios Inteligente
          </h3>
          <p className="text-xs text-slate-400">
            Detección de duplicados, desambiguación de variantes y autocompletado IA.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre & Botón IA */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-300">
              Nombre del Ejercicio *
            </label>
            <button
              type="button"
              onClick={() => handleAutocompleteAI()}
              disabled={generatingAI || !formData.nombre.trim()}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 disabled:opacity-50 flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition-all"
            >
              {generatingAI ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analizando con IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> ✨ Autocompletar con IA
                </>
              )}
            </button>
          </div>

          <input
            type="text"
            required
            placeholder="Ej: Sentadilla Búlgara con Mancuernas (o ingresa 'Aductor' para ver variantes)"
            value={formData.nombre}
            onChange={(e) => {
              setFormData({ ...formData, nombre: e.target.value });
              if (sugerenciasAmbiguas.length > 0) setSugerenciasAmbiguas([]);
              if (ejercicioDuplicado) setEjercicioDuplicado(null);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* ALERTA DE DUPLICADOS EN BASE DE DATOS */}
        {ejercicioDuplicado && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-200">
                El ejercicio &quot;{ejercicioDuplicado.nombre_ejercicio || ejercicioDuplicado.nombre}&quot; ya existe en el catálogo.
              </p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Te recomendamos buscarlo directamente en la biblioteca y subir tu variante de video para no duplicar fichas técnicas.
              </p>
            </div>
          </div>
        )}

        {/* CHIPS DE DESAMBIGUACIÓN IA (Variantes Específicas) */}
        {sugerenciasAmbiguas.length > 0 && (
          <div className="bg-indigo-950/40 border border-indigo-500/30 p-3.5 rounded-xl space-y-2">
            <p className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> El término es ambiguo. Selecciona la variante exacta:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {sugerenciasAmbiguas.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSugerencia(sug)}
                  className="bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-200 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nombres Comunes / Alias */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Nombres Comunes / Sinónimos (Facilita búsquedas al crear rutinas)
          </label>
          <input
            type="text"
            placeholder="Ej: abducción de cadera, patada lateral, aductor en polea"
            value={formData.nombres_comunes}
            onChange={(e) => setFormData({ ...formData, nombres_comunes: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Grupo Muscular & Equipamiento */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Grupo Muscular
            </label>
            <select
              value={formData.grupo_muscular}
              onChange={(e) => setFormData({ ...formData, grupo_muscular: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Pecho">Pecho</option>
              <option value="Espalda">Espalda</option>
              <option value="Piernas">Piernas</option>
              <option value="Hombros">Hombros</option>
              <option value="Brazos">Brazos</option>
              <option value="Abdomen">Abdomen</option>
              <option value="Cardio">Cardio</option>
              <option value="Full Body">Full Body</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Equipamiento
            </label>
            <input
              type="text"
              placeholder="Ej: Máquina de aductores acostada"
              value={formData.equipamiento}
              onChange={(e) => setFormData({ ...formData, equipamiento: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Nivel de Dificultad (puedes marcar varios)
            </label>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {["Principiante", "Intermedio", "Avanzado"].map((nivel) => {
                const isSelected = Array.isArray(formData.dificultad)
                  ? formData.dificultad.some((d) => d.toLowerCase() === nivel.toLowerCase())
                  : (typeof formData.dificultad === "string" && formData.dificultad.toLowerCase().includes(nivel.toLowerCase()));
                return (
                  <button
                    key={nivel}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => {
                        const currentList = Array.isArray(prev.dificultad)
                          ? prev.dificultad
                          : (typeof prev.dificultad === "string" ? prev.dificultad.split(",").map(s => s.trim()) : ["Intermedio"]);
                        const exists = currentList.some((d) => d.toLowerCase() === nivel.toLowerCase());
                        let updated;
                        if (exists) {
                          updated = currentList.filter((d) => d.toLowerCase() !== nivel.toLowerCase());
                          if (updated.length === 0) updated = [nivel]; // mantener al menos 1
                        } else {
                          updated = [...currentList, nivel];
                        }
                        return { ...prev, dificultad: updated };
                      });
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? "bg-indigo-600/30 border-indigo-500 text-indigo-200 shadow-sm shadow-indigo-600/20"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${isSelected ? "bg-indigo-500 text-white font-bold" : "border border-slate-700"}`}>
                      {isSelected ? "✓" : ""}
                    </span>
                    {nivel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Instrucciones / Descripción
          </label>
          <textarea
            rows={3}
            placeholder="Consejos clave sobre técnica o rango de movimiento (puedes autocompletar con IA)..."
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Zona de Carga de Video */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-indigo-400" /> Video Demostrativo del Coach (Opcional)
          </label>
          
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
              file
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-slate-800 hover:border-indigo-500/50 bg-slate-950/60"
            }`}
          >
            {file ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-semibold text-indigo-300 truncate">
                    📹 {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setHasWatermark(false);
                    }}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-indigo-500/20">
                  <button
                    type="button"
                    disabled={analyzingVideo}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalyzeVideo(file);
                    }}
                    className="text-xs font-bold text-indigo-300 hover:text-white bg-indigo-600/30 hover:bg-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-500/40 flex items-center gap-1.5 transition-all"
                  >
                    {analyzingVideo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analizando Video...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> ✨ Analizar Video con IA
                      </>
                    )}
                  </button>

                  {hasWatermark && (
                    <span className="text-[11px] text-amber-300 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      ⚠️ Marca de agua detectada al final
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <UploadCloud className="w-8 h-8 mx-auto mb-1 text-slate-500" />
                <p className="text-xs font-medium text-slate-300">
                  Arrastra tu video de ejecución aquí o <span className="text-indigo-400 underline">examina</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  ✨ La IA detectará automáticamente el ejercicio, técnica y nombres comunes desde el video
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => {
                const chosen = e.target.files?.[0];
                if (chosen) {
                  setFile(chosen);
                  if (!formData.nombre.trim()) {
                    handleAnalyzeVideo(chosen);
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Barra de Progreso */}
        {uploading && (
          <div className="pt-2">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{statusMessage}</span>
              {file && <span>{progress}%</span>}
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-200"
                style={{ width: `${file ? progress : 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Mensajes de Estado */}
        {statusMessage && !uploading && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium ${
              isError
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}
          >
            {isError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Botón de Enviar */}
        <button
          type="submit"
          disabled={uploading || !formData.nombre.trim()}
          className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 text-sm"
        >
          <Dumbbell className="w-4 h-4" />
          {uploading ? "Creando Ejercicio..." : "Guardar Ejercicio en el Catálogo"}
        </button>
      </form>
    </div>
  );
}
