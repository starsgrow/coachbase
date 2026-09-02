"use client";
import { useState, useRef, useEffect } from "react";
import { 
  Sparkles, Mic, Plus, Dumbbell, Calendar, Users, 
  Trash2, Copy, Edit3, Check, X, Play, Square, Loader2, 
  ArrowRight, Award, RefreshCw, Search, UserPlus, 
  FolderPlus, CheckCircle2, AlertTriangle, Ruler, Target,
  BookOpen, Layers, Eye, Zap
} from "lucide-react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import ExercisePicker from "@/components/ExercisePicker";
import BotonDescargaRutinaPDF from "@/components/BotonDescargaRutinaPDF";

export default function RutinasManager({
  rutinasIniciales,
  clientes: clientesIniciales,
  ejerciciosGlobales,
  ejerciciosCoach,
  coachId,
  coachNombre = "Coach Olympo",
  coachTenant = "olympocoach",
  coachLogo = null,
  coachColorPrimario = "#2563EB",
}) {
  const [rutinas, setRutinas] = useState(rutinasIniciales || []);
  const [clientes, setClientes] = useState(clientesIniciales || []);
  const [activeTab, setActiveTab] = useState("todas"); // 'todas' | 'asignadas' | 'plantillas'
  const [searchTerm, setSearchTerm] = useState("");

  // Modal 1: Asignar Rutina a Alumno (Personalizada)
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [clienteFormData, setClienteFormData] = useState({
    peso_kg: "",
    altura_cm: "",
    grasa_corporal: "",
    nivel: "Intermedio",
    objetivo: "Hipertrofia",
    lesiones: ""
  });
  const [guardandoDatosCliente, setGuardandoDatosCliente] = useState(false);
  const [modoCreacionAlumno, setModoCreacionAlumno] = useState("ia"); // 'ia' | 'voz' | 'manual' | 'banco'
  const [plantillaSeleccionadaId, setPlantillaSeleccionadaId] = useState("");

  // Modal 2: Crear Rutina General (Banco de Plantillas)
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [formBanco, setFormBanco] = useState({
    nombre_rutina: "",
    objetivo: "hipertrofia",
    nivel: "intermedio",
    dias_semana: 4,
    modo: "ia" // 'ia' | 'voz' | 'manual'
  });

  // Modal Asignar Rápido desde Tarjeta de Banco
  const [showQuickAssignModal, setShowQuickAssignModal] = useState(false);
  const [rutinaParaAsignar, setRutinaParaAsignar] = useState(null);
  const [quickAssignClienteId, setQuickAssignClienteId] = useState("");
  const [assigningQuick, setAssigningQuick] = useState(false);

  // Estados del Editor de Rutina
  const [showEditor, setShowEditor] = useState(false);
  const [rutinaEditando, setRutinaEditando] = useState(null);
  const [selectedDiaIdx, setSelectedDiaIdx] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [savingRutina, setSavingRutina] = useState(false);

  // Estados de Grabación por Voz
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [grabandoVoz, setGrabandoVoz] = useState(false);
  const [textoVoz, setTextoVoz] = useState("");
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [procesandoIA, setProcesandoIA] = useState(false);
  const [voiceTargetClienteId, setVoiceTargetClienteId] = useState(null);
  const [isModifyingDay, setIsModifyingDay] = useState(false);
  const [modifyingExerciseIdx, setModifyingExerciseIdx] = useState(null);
  const [replacingExerciseIdx, setReplacingExerciseIdx] = useState(null);
  const [previewEjercicio, setPreviewEjercicio] = useState(null);

  // Estados de IA Automática
  const [generandoAutoIA, setGenerandoAutoIA] = useState(false);

  // Refs de grabación de voz
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

  // Limpiar reconocedores de audio al desmontar
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Obtener alumno seleccionado actual en el modal
  const clienteActual = clientes.find((c) => c.id === selectedClienteId);

  // Cuando cambia el alumno en el modal de asignación, prellenar sus datos
  const handleSelectCliente = (cId) => {
    setSelectedClienteId(cId);
    const cl = clientes.find((c) => c.id === cId);
    if (cl) {
      setClienteFormData({
        peso_kg: cl.peso_kg || "",
        altura_cm: cl.altura_cm || "",
        grasa_corporal: cl.grasa_corporal || "",
        nivel: cl.nivel || "Intermedio",
        objetivo: cl.objetivo || "Hipertrofia",
        lesiones: cl.lesiones || ""
      });
    }
  };

  // Verificar si la ficha antropométrica del alumno tiene datos faltantes
  const faltanDatosAlumno = (cl) => {
    if (!cl) return false;
    return !cl.peso_kg || !cl.altura_cm || !cl.objetivo || !cl.nivel;
  };

  // -------------------------------------------------------------
  // GUARDAR / ACTUALIZAR DATOS ANTROPOMÉTRICOS DEL ALUMNO
  // -------------------------------------------------------------
  const handleActualizarDatosAlumno = async () => {
    if (!clienteActual) return;
    setGuardandoDatosCliente(true);

    try {
      const payload = {
        ...clienteActual,
        peso_kg: clienteFormData.peso_kg ? parseFloat(clienteFormData.peso_kg) : null,
        altura_cm: clienteFormData.altura_cm ? parseFloat(clienteFormData.altura_cm) : null,
        grasa_corporal: clienteFormData.grasa_corporal ? parseFloat(clienteFormData.grasa_corporal) : null,
        nivel: clienteFormData.nivel,
        objetivo: clienteFormData.objetivo,
        lesiones: clienteFormData.lesiones,
        coach_id: coachId
      };

      const res = await fetchWithAuth("/api/alumnos/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Error al actualizar alumno");
      const saved = await res.json();

      setClientes((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      alert("✅ Ficha antropométrica actualizada con éxito");
    } catch (err) {
      console.error(err);
      alert("Error guardando datos del alumno: " + err.message);
    } finally {
      setGuardandoDatosCliente(false);
    }
  };

  // -------------------------------------------------------------
  // EJECUTAR ASIGNACIÓN A ALUMNO (IA, Voz, Manual o Clonar Banco)
  // -------------------------------------------------------------
  const handleProcederAsignacion = async () => {
    if (!selectedClienteId) {
      return alert("Selecciona un alumno para continuar.");
    }

    const cl = clientes.find((c) => c.id === selectedClienteId);
    const nombreAlumno = cl?.nombre || "Alumno";

    if (modoCreacionAlumno === "ia") {
      // Generar con IA personalizada para este alumno
      setGenerandoAutoIA(true);
      try {
        const res = await fetchWithAuth("/api/rutinas/generar-ia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: "ia-automatica",
            objetivo: clienteFormData.objetivo || cl?.objetivo || "Hipertrofia",
            nivel: clienteFormData.nivel || cl?.nivel || "Intermedio",
            dias_semana: 4,
            lesiones: clienteFormData.lesiones || cl?.lesiones || "",
            coach_id: coachId
          })
        });

        const data = await res.json();
        if (res.ok && data.rutina) {
          abrirNuevoEditor({
            nombre_rutina: `Rutina Personalizada — ${nombreAlumno}`,
            objetivo: clienteFormData.objetivo || cl?.objetivo || "Hipertrofia",
            nivel: clienteFormData.nivel || cl?.nivel || "Intermedio",
            dias_semana: data.rutina.length,
            cliente_id: selectedClienteId,
            estructura_json: data.rutina
          });
          setShowAsignarModal(false);
        } else {
          alert("Error generando rutina: " + (data.error || "Intenta nuevamente"));
        }
      } catch (e) {
        console.error(e);
        alert("Error de conexión con la IA.");
      } finally {
        setGenerandoAutoIA(false);
      }
    } else if (modoCreacionAlumno === "voz") {
      setVoiceTargetClienteId(selectedClienteId);
      setShowAsignarModal(false);
      setShowVoiceModal(true);
    } else if (modoCreacionAlumno === "manual") {
      abrirNuevoEditor({
        nombre_rutina: `Rutina Personalizada — ${nombreAlumno}`,
        objetivo: clienteFormData.objetivo || cl?.objetivo || "Hipertrofia",
        nivel: clienteFormData.nivel || cl?.nivel || "Intermedio",
        dias_semana: 4,
        cliente_id: selectedClienteId,
        estructura_json: [
          { dia: 1, nombre: "Día 1: Push / Torso", ejercicios: [] },
          { dia: 2, nombre: "Día 2: Pull / Espalda", ejercicios: [] },
          { dia: 3, nombre: "Día 3: Pierna & Glúteos", ejercicios: [] },
          { dia: 4, nombre: "Día 4: Cardio & Core", ejercicios: [] }
        ]
      });
      setShowAsignarModal(false);
    } else if (modoCreacionAlumno === "banco") {
      const plantilla = rutinas.find((r) => r.id === plantillaSeleccionadaId);
      if (!plantilla) return alert("Selecciona una plantilla del banco.");

      abrirNuevoEditor({
        nombre_rutina: `${plantilla.nombre_rutina} (Para ${nombreAlumno})`,
        descripcion: plantilla.descripcion || "",
        objetivo: plantilla.objetivo || "Hipertrofia",
        nivel: plantilla.nivel || "Intermedio",
        dias_semana: plantilla.dias_semana || 4,
        cliente_id: selectedClienteId,
        estructura_json: JSON.parse(JSON.stringify(plantilla.estructura_json || []))
      });
      setShowAsignarModal(false);
    }
  };

  // -------------------------------------------------------------
  // EJECUTAR CREACIÓN DE RUTINA PARA EL BANCO (PLANTILLA GENERAL)
  // -------------------------------------------------------------
  const handleCrearRutinaBanco = async () => {
    const nombre = formBanco.nombre_rutina.trim() || `Plantilla ${formBanco.objetivo.toUpperCase()} (${formBanco.dias_semana} Días)`;

    if (formBanco.modo === "ia") {
      setGenerandoAutoIA(true);
      try {
        const res = await fetchWithAuth("/api/rutinas/generar-ia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: "ia-automatica",
            objetivo: formBanco.objetivo,
            nivel: formBanco.nivel,
            dias_semana: formBanco.dias_semana,
            coach_id: coachId
          })
        });

        const data = await res.json();
        if (res.ok && data.rutina) {
          abrirNuevoEditor({
            nombre_rutina: nombre,
            objetivo: formBanco.objetivo,
            nivel: formBanco.nivel,
            dias_semana: data.rutina.length,
            cliente_id: null,
            estructura_json: data.rutina
          });
          setShowBancoModal(false);
        } else {
          alert("Error generando plantilla: " + (data.error || "Intenta nuevamente"));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setGenerandoAutoIA(false);
      }
    } else if (formBanco.modo === "voz") {
      setVoiceTargetClienteId(null);
      setShowBancoModal(false);
      setShowVoiceModal(true);
    } else if (formBanco.modo === "manual") {
      abrirNuevoEditor({
        nombre_rutina: nombre,
        objetivo: formBanco.objetivo,
        nivel: formBanco.nivel,
        dias_semana: formBanco.dias_semana,
        cliente_id: null,
        estructura_json: Array.from({ length: formBanco.dias_semana }, (_, i) => ({
          dia: i + 1,
          nombre: `Día ${i + 1}: Sesión de Entrenamiento`,
          ejercicios: []
        }))
      });
      setShowBancoModal(false);
    }
  };

  // -------------------------------------------------------------
  // ASIGNACIÓN RÁPIDA DE PLANTILLA DESDE LA TARJETA
  // -------------------------------------------------------------
  const handleQuickAssign = async () => {
    if (!rutinaParaAsignar || !quickAssignClienteId) return;
    setAssigningQuick(true);

    try {
      const cl = clientes.find((c) => c.id === quickAssignClienteId);
      const copia = {
        ...rutinaParaAsignar,
        id: undefined,
        nombre_rutina: `${rutinaParaAsignar.nombre_rutina} — ${cl?.nombre || "Alumno"}`,
        cliente_id: quickAssignClienteId,
        coach_id: coachId
      };

      const res = await fetchWithAuth("/api/rutinas/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(copia)
      });

      const data = await res.json();
      if (res.ok && data.rutina) {
        setRutinas([data.rutina, ...rutinas]);
        setShowQuickAssignModal(false);
        alert(`✨ ¡Plantilla asignada exitosamente a ${cl?.nombre}!`);
      } else {
        alert("Error al asignar: " + (data.error || "Desconocido"));
      }
    } catch (e) {
      console.error(e);
      alert("Error al asignar plantilla.");
    } finally {
      setAssigningQuick(false);
    }
  };

  // -------------------------------------------------------------
  // FUNCIONES DE GRABACIÓN DE VOZ (Whisper)
  // -------------------------------------------------------------
  const iniciarGrabacionVoz = async () => {
    setTextoVoz("");
    audioChunksRef.current = [];

    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = "es-CO";
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setTextoVoz(transcript);
      };

      recognitionRef.current = recognition;
      try { recognition.start(); } catch (e) {}
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setTranscribiendo(true);

        try {
          const formData = new FormData();
          formData.append("audio", new File([audioBlob], "grabacion.webm", { type: "audio/webm" }));

          const res = await fetchWithAuth("/api/rutinas/transcribir", {
            method: "POST",
            body: formData
          });

          const data = await res.json();
          if (res.ok && data.text) {
            setTextoVoz(data.text);
          }
        } catch (err) {
          console.error("Error contactando Whisper:", err);
        } finally {
          setTranscribiendo(false);
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setGrabandoVoz(true);
    } catch (err) {
      console.error("Error al acceder al micrófono:", err);
      alert("No pudimos acceder a tu micrófono. Verifica los permisos de tu navegador.");
    }
  };

  const detenerGrabacionVoz = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setGrabandoVoz(false);
  };

  const procesarDictadoVozIA = async () => {
    if (!textoVoz.trim()) return alert("Por favor dicta tu instrucción antes de procesar.");

    setProcesandoIA(true);
    try {
      if (modifyingExerciseIdx !== null && rutinaEditando) {
        const ejercicioActual = rutinaEditando.estructura_json[selectedDiaIdx].ejercicios[modifyingExerciseIdx];
        
        const res = await fetchWithAuth("/api/rutinas/generar-ia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: "voz-modificar-ejercicio",
            comando: textoVoz,
            ejercicio_actual: ejercicioActual,
            coach_id: coachId
          })
        });

        const data = await res.json();
        if (res.ok && data.ejercicio) {
          const estructura = [...rutinaEditando.estructura_json];
          estructura[selectedDiaIdx].ejercicios[modifyingExerciseIdx] = data.ejercicio;
          setRutinaEditando({ ...rutinaEditando, estructura_json: estructura });
          setShowVoiceModal(false);
          setModifyingExerciseIdx(null);
        } else {
          alert("Error de la IA: " + (data.error || "No se pudo interpretar el dictado."));
        }
      } else if (isModifyingDay && rutinaEditando) {
        const diaActual = rutinaEditando.estructura_json[selectedDiaIdx];
        
        const res = await fetchWithAuth("/api/rutinas/generar-ia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: "voz-modificar",
            comando: textoVoz,
            dia_actual: diaActual,
            coach_id: coachId
          })
        });

        const data = await res.json();
        if (res.ok && data.rutina && data.rutina.length > 0) {
          const estructura = [...rutinaEditando.estructura_json];
          estructura[selectedDiaIdx] = data.rutina[0];
          setRutinaEditando({ ...rutinaEditando, estructura_json: estructura });
          setShowVoiceModal(false);
          setIsModifyingDay(false);
        } else {
          alert("Error de la IA: " + (data.error || "No se pudo interpretar el dictado."));
        }
      } else {
        const res = await fetchWithAuth("/api/rutinas/generar-ia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: "voz",
            comando: textoVoz,
            coach_id: coachId
          })
        });

        const data = await res.json();
        if (res.ok && data.rutina) {
          const cl = voiceTargetClienteId ? clientes.find((c) => c.id === voiceTargetClienteId) : null;
          abrirNuevoEditor({
            nombre_rutina: cl ? `Rutina Dictada — ${cl.nombre}` : "Rutina Dictada por Voz 🎙️",
            objetivo: cl?.objetivo || "hipertrofia",
            nivel: cl?.nivel || "intermedio",
            dias_semana: data.rutina.length,
            cliente_id: voiceTargetClienteId || null,
            estructura_json: data.rutina
          });
          setShowVoiceModal(false);
        } else {
          alert("Error de la IA: " + (data.error || "No se pudo interpretar el dictado."));
        }
      }
    } catch (err) {
      console.error("Error al procesar dictado:", err);
      alert("Error de conexión al conectar con OpenAI.");
    } finally {
      setProcesandoIA(false);
    }
  };

  // -------------------------------------------------------------
  // MANEJO DEL EDITOR DE RUTINAS
  // -------------------------------------------------------------
  const abrirNuevoEditor = (plantilla = null) => {
    const defaultRutina = plantilla || {
      nombre_rutina: "Nueva Rutina de Entrenamiento",
      descripcion: "",
      objetivo: "hipertrofia",
      nivel: "intermedio",
      dias_semana: 4,
      cliente_id: null,
      estructura_json: [
        { dia: 1, nombre: "Día 1: Push (Pecho/Hombro/Tríceps)", ejercicios: [] },
        { dia: 2, nombre: "Día 2: Pull (Espalda/Bíceps)", ejercicios: [] },
        { dia: 3, nombre: "Día 3: Pierna (Énfasis Cuádriceps)", ejercicios: [] },
        { dia: 4, nombre: "Día 4: Torso & Core", ejercicios: [] }
      ]
    };

    setRutinaEditando(defaultRutina);
    setSelectedDiaIdx(0);
    setShowEditor(true);
  };

  const handleAgregarDia = () => {
    if (!rutinaEditando) return;
    const numDias = (rutinaEditando.estructura_json || []).length + 1;
    const nuevoDia = {
      dia: numDias,
      nombre: `Día ${numDias}: Entrenamiento Personalizado`,
      ejercicios: []
    };

    setRutinaEditando({
      ...rutinaEditando,
      dias_semana: numDias,
      estructura_json: [...rutinaEditando.estructura_json, nuevoDia]
    });
    setSelectedDiaIdx(numDias - 1);
  };

  const handleEliminarDia = (diaIdx) => {
    if (!rutinaEditando) return;
    const estructura = [...rutinaEditando.estructura_json];
    estructura.splice(diaIdx, 1);
    estructura.forEach((d, i) => (d.dia = i + 1));

    setRutinaEditando({
      ...rutinaEditando,
      dias_semana: estructura.length,
      estructura_json: estructura
    });
    setSelectedDiaIdx(Math.max(0, diaIdx - 1));
  };

  const handleSelectExercise = (ej) => {
    if (!rutinaEditando) return;
    const estructura = [...rutinaEditando.estructura_json];
    const diaActual = estructura[selectedDiaIdx];

    const esCardio =
      (ej.grupo_muscular || "").toLowerCase() === "cardio" ||
      (ej.tipo_ejercicio || "").toLowerCase() === "cardio" ||
      (ej.nombre || "").toLowerCase().includes("bici") ||
      (ej.nombre || "").toLowerCase().includes("cinta") ||
      (ej.nombre || "").toLowerCase().includes("elíptica") ||
      (ej.nombre || "").toLowerCase().includes("remo");

    const nuevoEjercicio = {
      ejercicio_id: ej.id,
      nombre: ej.nombre_ejercicio || ej.nombre,
      grupo_muscular: ej.grupo_muscular || "General",
      tipo_ejercicio: esCardio ? "cardio" : "fuerza",
      series: esCardio ? null : 4,
      repeticiones: esCardio ? null : [10, 10, 10, 10],
      peso_sugerido_kg: null,
      porcentaje_peso: "75%",
      descanso_seg: esCardio ? 60 : 90,
      duracion_min: esCardio ? 20 : null,
      modalidad_cardio: esCardio ? "LISS (Moderado)" : null,
      intensidad_nivel: esCardio ? "Nivel 5" : null,
      notas: ej.descripcion ? ej.descripcion.slice(0, 80) : "",
      thumbnail_url: ej.thumbnail_url || ej.preview_url_webp,
      video_demo_url: ej.video_demo_url || null
    };

    if (replacingExerciseIdx !== null) {
      diaActual.ejercicios[replacingExerciseIdx] = nuevoEjercicio;
      setReplacingExerciseIdx(null);
    } else {
      diaActual.ejercicios.push(nuevoEjercicio);
    }
    
    setRutinaEditando({ ...rutinaEditando, estructura_json: estructura });
    setShowExercisePicker(false);
  };

  const handleEliminarEjercicio = (ejIdx) => {
    if (!rutinaEditando) return;
    const estructura = [...rutinaEditando.estructura_json];
    estructura[selectedDiaIdx].ejercicios.splice(ejIdx, 1);
    setRutinaEditando({ ...rutinaEditando, estructura_json: estructura });
  };

  const handleUpdateEjercicioParam = (ejIdx, key, val) => {
    if (!rutinaEditando) return;
    const estructura = [...rutinaEditando.estructura_json];
    estructura[selectedDiaIdx].ejercicios[ejIdx][key] = val;
    setRutinaEditando({ ...rutinaEditando, estructura_json: estructura });
  };

  const handleGuardarRutina = async () => {
    if (!rutinaEditando.nombre_rutina.trim()) {
      return alert("Ingresa un nombre para la rutina.");
    }

    setSavingRutina(true);
    try {
      const res = await fetchWithAuth("/api/rutinas/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rutinaEditando,
          coach_id: coachId
        })
      });

      const data = await res.json();
      if (res.ok && data.rutina) {
        setRutinas((prev) => {
          const existe = prev.some((r) => r.id === data.rutina.id);
          if (existe) {
            return prev.map((r) => (r.id === data.rutina.id ? data.rutina : r));
          }
          return [data.rutina, ...prev];
        });
        setShowEditor(false);
      } else {
        alert("Error al guardar: " + (data.error || "Desconocido"));
      }
    } catch (err) {
      console.error("Error guardando rutina:", err);
      alert("Error de conexión al guardar rutina.");
    } finally {
      setSavingRutina(false);
    }
  };

  const handleDuplicarRutina = async (rutina) => {
    const copia = {
      ...rutina,
      id: undefined,
      nombre_rutina: `${rutina.nombre_rutina} (Copia)`,
      coach_id: coachId
    };

    try {
      const res = await fetchWithAuth("/api/rutinas/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(copia)
      });

      const data = await res.json();
      if (res.ok && data.rutina) {
        setRutinas([data.rutina, ...rutinas]);
      }
    } catch (err) {
      console.error("Error duplicando rutina:", err);
    }
  };

  const handleEliminarRutina = async (id) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta rutina?")) return;

    try {
      const res = await fetchWithAuth(`/api/rutinas/eliminar?id=${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setRutinas(rutinas.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Error eliminando rutina:", err);
    }
  };

  // Filtrado de rutinas
  const rutinasFiltradas = rutinas.filter((r) => {
    const coincideNombre = r.nombre_rutina?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!coincideNombre) return false;

    if (activeTab === "asignadas") return !!r.cliente_id;
    if (activeTab === "plantillas") return !r.cliente_id;
    return true;
  });

  const totalAsignadas = rutinas.filter((r) => !!r.cliente_id).length;
  const totalPlantillas = rutinas.filter((r) => !r.cliente_id).length;

  return (
    <div className="space-y-6">
      
      {/* Header Principal con las 2 Opciones de Creación */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Dumbbell className="w-7 h-7 text-indigo-400" />
            Rutinas & Planes de Entrenamiento
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Asigna planes 1 a 1 a tus alumnos o crea plantillas maestras para tu banco de rutinas.
          </p>
        </div>

        {/* 2 Botones Principales de Creación */}
        <div className="flex flex-wrap gap-2.5">
          {/* Opción 1: Asignar a Alumno */}
          <button
            onClick={() => {
              if (clientes.length > 0) handleSelectCliente(clientes[0].id);
              setShowAsignarModal(true);
            }}
            className="bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4 text-sky-200" /> 👤 Asignar Rutina a Alumno
          </button>

          {/* Opción 2: Crear Rutina para el Banco */}
          <button
            onClick={() => setShowBancoModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow transition-all active:scale-95"
          >
            <FolderPlus className="w-4 h-4 text-emerald-400" /> 📚 Crear Rutina para el Banco
          </button>
        </div>
      </div>

      {/* Tabs de Filtro y Buscador */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab("todas")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === "todas" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Todas ({rutinas.length})
          </button>
          <button
            onClick={() => setActiveTab("asignadas")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "asignadas" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Asignadas a Alumnos ({totalAsignadas})
          </button>
          <button
            onClick={() => setActiveTab("plantillas")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "plantillas" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Banco de Plantillas ({totalPlantillas})
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar rutina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Grid de Rutinas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {rutinasFiltradas.length > 0 ? (
          rutinasFiltradas.map((r) => {
            const numDias = (r.estructura_json || []).length || r.dias_semana || 4;
            const esPlantilla = !r.cliente_id;
            const cl = clientes.find((c) => c.id === r.cliente_id);
            const clienteNombre = cl?.nombre || r.coach_clientes?.nombre || "Sin Asignar";

            return (
              <div
                key={r.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-lg group relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                      {r.objetivo || "Hipertrofia"}
                    </span>
                    
                    {esPlantilla ? (
                      <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Plantilla Banco
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300 bg-slate-950/80 border border-slate-800 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 font-bold">
                        <Users className="w-3.5 h-3.5 text-sky-400" /> {clienteNombre}
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-white text-base group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {r.nombre_rutina}
                  </h3>

                  <p className="text-slate-400 text-xs mt-1 line-clamp-2">
                    {r.descripcion || `${numDias} Días por Semana • Nivel ${r.nivel || "Intermedio"}`}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" /> {numDias} Días/Semana
                    </span>
                    <span className="capitalize font-semibold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                      ⚡ {r.nivel || "Intermedio"}
                    </span>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRutinaEditando(r);
                      setSelectedDiaIdx(0);
                      setShowEditor(true);
                    }}
                    className="flex-1 bg-slate-800 hover:bg-indigo-600/20 text-slate-200 hover:text-indigo-300 border border-slate-700 hover:border-indigo-500/30 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>

                  {esPlantilla && (
                    <button
                      onClick={() => {
                        setRutinaParaAsignar(r);
                        if (clientes.length > 0) setQuickAssignClienteId(clientes[0].id);
                        setShowQuickAssignModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow"
                      title="Asignar esta plantilla a un alumno"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Asignar
                    </button>
                  )}

                  {r.cliente_id && (
                    <Link
                      href={`/${coachTenant}/panel/entrenador`}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow"
                      title="Entrenar en vivo con este alumno y registrar sobrecarga"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Entrenador
                    </Link>
                  )}

                  <BotonDescargaRutinaPDF
                    rutina={r}
                    coachNombre={coachNombre}
                    coachTenant={coachTenant}
                    coachLogo={coachLogo}
                    coachColorPrimario={coachColorPrimario}
                    clienteNombre={clienteNombre}
                    compact={true}
                  />

                  <button
                    onClick={() => handleDuplicarRutina(r)}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                    title="Duplicar rutina"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleEliminarRutina(r.id)}
                    className="p-2 rounded-xl bg-slate-950 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-slate-800 transition-colors"
                    title="Eliminar rutina"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl p-6">
            <Dumbbell className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-lg font-bold text-white">No se encontraron rutinas</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Asigna una rutina personalizada a un alumno o crea plantillas en tu banco de rutinas.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: ASIGNAR RUTINA A ALUMNO (CON DETECCIÓN DE DATOS) */}
      {/* ========================================================= */}
      {showAsignarModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-400" /> Asignar Rutina a Alumno
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Selecciona al atleta y personaliza su plan de entrenamiento según sus medidas.
                </p>
              </div>
              <button onClick={() => setShowAsignarModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Paso 1: Selección de Alumno */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Seleccionar Alumno Destinatario *</label>
              <select
                value={selectedClienteId}
                onChange={(e) => handleSelectCliente(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">— Selecciona un alumno —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    👤 {c.nombre} {c.telefono ? `(${c.telefono})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Paso 2: Inspector Antropométrico & Div Desplegable si faltan datos */}
            {clienteActual && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {faltanDatosAlumno(clienteActual) ? (
                  /* Div Desplegable para Completar Datos */
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" /> Ficha incompleta: completa las medidas de {clienteActual.nombre}
                      </span>
                      <button
                        type="button"
                        onClick={handleActualizarDatosAlumno}
                        disabled={guardandoDatosCliente}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] px-3 py-1 rounded-lg transition-all shadow disabled:opacity-50"
                      >
                        {guardandoDatosCliente ? "Guardando..." : "Guardar en su Ficha"}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Peso (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="75.0"
                          value={clienteFormData.peso_kg}
                          onChange={(e) => setClienteFormData({ ...clienteFormData, peso_kg: e.target.value })}
                          className="w-full bg-slate-950 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Altura (cm)</label>
                        <input
                          type="number"
                          placeholder="178"
                          value={clienteFormData.altura_cm}
                          onChange={(e) => setClienteFormData({ ...clienteFormData, altura_cm: e.target.value })}
                          className="w-full bg-slate-950 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">% Grasa</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="14.0"
                          value={clienteFormData.grasa_corporal}
                          onChange={(e) => setClienteFormData({ ...clienteFormData, grasa_corporal: e.target.value })}
                          className="w-full bg-slate-950 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Objetivo</label>
                        <select
                          value={clienteFormData.objetivo}
                          onChange={(e) => setClienteFormData({ ...clienteFormData, objetivo: e.target.value })}
                          className="w-full bg-slate-950 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                        >
                          <option value="Hipertrofia">🎯 Hipertrofia</option>
                          <option value="Pérdida de Grasa">🔥 Pérdida de Grasa</option>
                          <option value="Fuerza">⚡ Fuerza</option>
                          <option value="Salud">❤️ Salud & Recomposición</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Nivel</label>
                        <select
                          value={clienteFormData.nivel}
                          onChange={(e) => setClienteFormData({ ...clienteFormData, nivel: e.target.value })}
                          className="w-full bg-slate-950 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                        >
                          <option value="Principiante">Principiante</option>
                          <option value="Intermedio">Intermedio</option>
                          <option value="Avanzado">Avanzado</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-amber-300 uppercase">Lesiones / Limitaciones</label>
                      <input
                        type="text"
                        placeholder="Ej: Molestia en hombro derecho, evitar trasnuca..."
                        value={clienteFormData.lesiones}
                        onChange={(e) => setClienteFormData({ ...clienteFormData, lesiones: e.target.value })}
                        className="w-full bg-slate-950 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white mt-0.5"
                      />
                    </div>
                  </div>
                ) : (
                  /* Ficha Completa */
                  <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{clienteActual.peso_kg} kg</span>
                          <span>•</span>
                          <span>{clienteActual.altura_cm} cm</span>
                          <span>•</span>
                          <span className="text-emerald-400">{clienteActual.objetivo}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Nivel: {clienteActual.nivel} {clienteActual.lesiones ? `| ⚠️ ${clienteActual.lesiones}` : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Paso 3: Método de Creación para este Alumno */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-300">¿Cómo deseas crear esta rutina?</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setModoCreacionAlumno("ia")}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        modoCreacionAlumno === "ia"
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span className="text-[11px]">Generar con IA</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModoCreacionAlumno("voz")}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        modoCreacionAlumno === "voz"
                          ? "bg-rose-600/20 border-rose-500 text-rose-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Mic className="w-4 h-4 text-rose-400" />
                      <span className="text-[11px]">Dictar por Voz</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModoCreacionAlumno("manual")}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        modoCreacionAlumno === "manual"
                          ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span className="text-[11px]">Editor Manual</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModoCreacionAlumno("banco")}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        modoCreacionAlumno === "banco"
                          ? "bg-sky-600/20 border-sky-500 text-sky-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <BookOpen className="w-4 h-4 text-sky-400" />
                      <span className="text-[11px]">Usar Plantilla</span>
                    </button>
                  </div>
                </div>

                {/* Si elige Banco: Selector de Plantilla */}
                {modoCreacionAlumno === "banco" && (
                  <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                    <label className="block text-xs font-bold text-slate-300">Seleccionar Plantilla del Banco</label>
                    <select
                      value={plantillaSeleccionadaId}
                      onChange={(e) => setPlantillaSeleccionadaId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="">— Selecciona una plantilla maestra —</option>
                      {rutinas
                        .filter((r) => !r.cliente_id)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            📚 {r.nombre_rutina} ({r.dias_semana || 4} días • {r.objetivo})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Botón de Proceder */}
            <div className="pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleProcederAsignacion}
                disabled={!selectedClienteId || generandoAutoIA}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-extrabold text-xs transition-all shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generandoAutoIA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generandoAutoIA ? "Estructurando plan con IA..." : "Proceder a Diseñar Rutina"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CREAR RUTINA GENERAL (BANCO DE PLANTILLAS) */}
      {/* ========================================================= */}
      {showBancoModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-emerald-400" /> Nueva Plantilla para el Banco
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Crea rutinas maestras reutilizables para clonar o asignar en el futuro.
                </p>
              </div>
              <button onClick={() => setShowBancoModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nombre de la Plantilla</label>
                <input
                  type="text"
                  placeholder="Ej: Torso / Pierna Hipertrofia 4 Días"
                  value={formBanco.nombre_rutina}
                  onChange={(e) => setFormBanco({ ...formBanco, nombre_rutina: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Objetivo</label>
                  <select
                    value={formBanco.objetivo}
                    onChange={(e) => setFormBanco({ ...formBanco, objetivo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="hipertrofia">🎯 Hipertrofia</option>
                    <option value="fuerza">⚡ Fuerza</option>
                    <option value="resistencia">🔥 Resistencia</option>
                    <option value="salud">❤️ Salud General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Nivel</label>
                  <select
                    value={formBanco.nivel}
                    onChange={(e) => setFormBanco({ ...formBanco, nivel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="principiante">Principiante</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Días por Semana</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={formBanco.dias_semana}
                  onChange={(e) => setFormBanco({ ...formBanco, dias_semana: parseInt(e.target.value) || 4 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Método de Creación</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormBanco({ ...formBanco, modo: "ia" })}
                    className={`py-2 px-1 rounded-xl border text-center text-[11px] font-bold ${
                      formBanco.modo === "ia"
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    🤖 Con IA
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormBanco({ ...formBanco, modo: "voz" })}
                    className={`py-2 px-1 rounded-xl border text-center text-[11px] font-bold ${
                      formBanco.modo === "voz"
                        ? "bg-rose-600/20 border-rose-500 text-rose-300"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    🎙️ Por Voz
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormBanco({ ...formBanco, modo: "manual" })}
                    className={`py-2 px-1 rounded-xl border text-center text-[11px] font-bold ${
                      formBanco.modo === "manual"
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    ✏️ Manual
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCrearRutinaBanco}
                disabled={generandoAutoIA}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generandoAutoIA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {generandoAutoIA ? "Generando Plantilla..." : "Crear Plantilla en el Banco"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ASIGNACIÓN RÁPIDA DE PLANTILLA DESDE TARJETA */}
      {/* ========================================================= */}
      {showQuickAssignModal && rutinaParaAsignar && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" /> Asignar Plantilla
              </h3>
              <button onClick={() => setShowQuickAssignModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Se creará una copia de <strong>"{rutinaParaAsignar.nombre_rutina}"</strong> asignada al alumno seleccionado:
              </p>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Alumno Destinatario</label>
                <select
                  value={quickAssignClienteId}
                  onChange={(e) => setQuickAssignClienteId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      👤 {c.nombre} ({c.email || c.telefono})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleQuickAssign}
                disabled={assigningQuick || !quickAssignClienteId}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {assigningQuick ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {assigningQuick ? "Asignando..." : "Confirmar Asignación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: DICTAR POR VOZ 🎙️ */}
      {/* ========================================================= */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Mic className="w-5 h-5 text-red-500 animate-pulse" /> {isModifyingDay ? "Modificar Día con Voz" : "Dictar Rutina por Voz"}
              </h3>
              <button onClick={() => { setShowVoiceModal(false); setIsModifyingDay(false); setModifyingExerciseIdx(null); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {modifyingExerciseIdx !== null
                ? "Dicta cómo deseas modificar este ejercicio en particular. (ej: 'Sube las series a 5 y baja el descanso', 'Cambia el ejercicio a sentadilla libre', 'Pon que el ritmo sea rápido')."
                : isModifyingDay 
                ? "Dicta qué deseas cambiar en este día. (ej: 'Quita el press banca y pon flexiones', 'Cambia el cardio por HIIT', 'Sube las series a 4 en todos')." 
                : "Habla con naturalidad dictando los ejercicios, series, repeticiones o minutos de cardio. La IA capturará tu voz y estructurará el plan."}
            </p>

            {/* Caja de Transcripción */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[120px] text-sm text-slate-200 focus-within:border-indigo-500 relative flex flex-col">
              <textarea
                value={textoVoz}
                onChange={(e) => setTextoVoz(e.target.value)}
                placeholder='Presiona el micrófono y empieza a hablar... (ej: "Día 1: press banca 4 series de 10 reps, 20 minutos de bici estática LISS...")'
                className="w-full bg-transparent text-slate-200 resize-none focus:outline-none flex-1 min-h-[120px] placeholder:text-slate-500 placeholder:italic placeholder:text-xs"
              />

              {transcribiendo && (
                <div className="absolute right-3 bottom-3 flex items-center gap-2 text-xs text-indigo-400 bg-slate-900/90 px-3 py-1 rounded-full border border-indigo-500/30">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Whisper refinando texto...
                </div>
              )}
            </div>

            {/* Controles de Micrófono */}
            <div className="flex items-center justify-between pt-2">
              {!grabandoVoz ? (
                <button
                  onClick={iniciarGrabacionVoz}
                  className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all hover:scale-105"
                >
                  <Play className="w-4 h-4 fill-white" /> Iniciar Grabación
                </button>
              ) : (
                <button
                  onClick={detenerGrabacionVoz}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
                >
                  <Square className="w-4 h-4 fill-slate-950" /> Detener Grabación
                </button>
              )}

              <button
                onClick={procesarDictadoVozIA}
                disabled={!textoVoz.trim() || procesandoIA}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                {procesandoIA ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {modifyingExerciseIdx !== null ? "Modificando ejercicio..." : isModifyingDay ? "Modificando día..." : "Estructurando rutina..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> {modifyingExerciseIdx !== null ? "Modificar con IA →" : isModifyingDay ? "Modificar con IA →" : "Estructurar con IA →"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: EDITOR COMPLETO DE RUTINAS ✏️ */}
      {/* ========================================================= */}
      {showEditor && rutinaEditando && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            
            {/* Header del Editor */}
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 w-full">
                <input
                  type="text"
                  value={rutinaEditando.nombre_rutina}
                  onChange={(e) => setRutinaEditando({ ...rutinaEditando, nombre_rutina: e.target.value })}
                  placeholder="Nombre de la Rutina..."
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-base font-bold text-white w-full focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                {/* Selector de Alumno (o Dejar como Plantilla) */}
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                  <select
                    value={rutinaEditando.cliente_id || ""}
                    onChange={(e) => setRutinaEditando({ ...rutinaEditando, cliente_id: e.target.value || null })}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">📚 Guardar como Plantilla de Banco</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        👤 Asignar a: {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setShowEditor(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Barra de Tabs por Día */}
            <div className="p-2 border-b border-slate-800 bg-slate-900 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {(rutinaEditando.estructura_json || []).map((dia, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedDiaIdx(idx)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                      selectedDiaIdx === idx
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    <span>Día {dia.dia || idx + 1}</span>
                    <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full font-mono">
                      {(dia.ejercicios || []).length}
                    </span>
                  </button>
                ))}

                <button
                  onClick={handleAgregarDia}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 shrink-0 px-3"
                >
                  <Plus className="w-3.5 h-3.5" /> Añadir Día
                </button>
              </div>
            </div>

            {/* Cuerpo del Día Seleccionado */}
            {rutinaEditando.estructura_json && rutinaEditando.estructura_json[selectedDiaIdx] ? (
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <div className="flex-1 w-full">
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">Enfoque del Día</label>
                    <input
                      type="text"
                      value={rutinaEditando.estructura_json[selectedDiaIdx].nombre || ""}
                      onChange={(e) => {
                        const estructura = [...rutinaEditando.estructura_json];
                        estructura[selectedDiaIdx].nombre = e.target.value;
                        setRutinaEditando({ ...rutinaEditando, estructura_json: estructura });
                      }}
                      className="bg-transparent text-sm font-bold text-white w-full focus:outline-none"
                      placeholder="Ej: Día 1: Pecho, Hombro y Tríceps..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsModifyingDay(true);
                        setShowVoiceModal(true);
                      }}
                      className="bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 hover:border-rose-500/50"
                      title="Editar este día con IA y Voz"
                    >
                      <Mic className="w-3.5 h-3.5" /> Modificar Día
                    </button>
                    <button
                      onClick={() => {
                        setReplacingExerciseIdx(null);
                        setShowExercisePicker(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Ejercicio
                    </button>
                    {rutinaEditando.estructura_json.length > 1 && (
                      <button
                        onClick={() => handleEliminarDia(selectedDiaIdx)}
                        className="p-1.5 text-slate-500 hover:text-red-400 bg-slate-900 rounded-xl"
                        title="Eliminar este día"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de Ejercicios del Día */}
                <div className="space-y-3">
                  {(rutinaEditando.estructura_json[selectedDiaIdx].ejercicios || []).map((ej, ejIdx) => {
                    const isCardio =
                      (ej.tipo_ejercicio || "").toLowerCase() === "cardio" ||
                      (ej.grupo_muscular || "").toLowerCase() === "cardio" ||
                      ej.duracion_min > 0 ||
                      (ej.nombre || "").toLowerCase().includes("bici") ||
                      (ej.nombre || "").toLowerCase().includes("cinta") ||
                      (ej.nombre || "").toLowerCase().includes("elíptica") ||
                      (ej.nombre || "").toLowerCase().includes("remo") ||
                      (ej.nombre || "").toLowerCase().includes("cardio");

                    return (
                      <div
                        key={ejIdx}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                      >
                        {/* Miniatura + Nombre */}
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <button 
                            type="button"
                            onClick={() => setPreviewEjercicio({ ...ej, ejIdx })}
                            className="w-10 h-10 rounded-xl bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center border border-slate-800 hover:opacity-75 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            title="Ver demostración del ejercicio"
                          >
                            {ej.thumbnail_url ? (
                              <img src={ej.thumbnail_url} alt={ej.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <Dumbbell className={`w-5 h-5 ${ej.ejercicio_id ? 'text-indigo-400' : 'text-rose-500 opacity-60'}`} />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className={`font-bold text-xs ${!ej.ejercicio_id ? 'text-rose-400' : 'text-slate-100'}`}>
                                {ej.nombre}
                              </h5>
                              {isCardio && (
                                <span className="text-[9px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold px-1.5 py-0.5 rounded">
                                  ⚡ Cardio
                                </span>
                              )}
                              {!ej.ejercicio_id && (
                                <span 
                                  className="text-[9px] bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 cursor-help"
                                  title="La IA interpretó este ejercicio pero no existe en tu catálogo. El alumno solo verá el texto. Puedes cambiarlo por uno oficial pulsando el botón de 'Cambiar'."
                                >
                                  ⚠️ No está en el banco
                                </span>
                              )}
                            </div>
                            {ej.video_demo_url && (
                              <span className="text-[9px] text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                                <Award className="w-3 h-3" /> Video del Coach 🏅
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Parámetros: Cardio vs Fuerza */}
                        {isCardio ? (
                          <div className="flex flex-wrap items-center gap-3 text-xs w-full sm:w-auto">
                            <div>
                              <label className="text-[9px] text-emerald-400 font-bold block">Duración (min)</label>
                              <input
                                type="number"
                                min="1"
                                max="180"
                                value={ej.duracion_min || 20}
                                onChange={(e) =>
                                  handleUpdateEjercicioParam(ejIdx, "duracion_min", parseInt(e.target.value) || 20)
                                }
                                className="w-16 bg-slate-900 border border-emerald-500/40 rounded-lg px-2 py-1 text-center font-bold text-emerald-200"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] text-slate-400 block">Modalidad</label>
                              <select
                                value={ej.modalidad_cardio || "LISS (Moderado)"}
                                onChange={(e) => handleUpdateEjercicioParam(ejIdx, "modalidad_cardio", e.target.value)}
                                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                              >
                                <option value="LISS (Moderado)">LISS (Moderado)</option>
                                <option value="HIIT (Intervalos)">HIIT (Intervalos)</option>
                                <option value="Calentamiento">Calentamiento</option>
                                <option value="Zona 2 (Quema Grasa)">Zona 2 (Quema Grasa)</option>
                                <option value="Sprint / Máxima">Sprint / Máxima</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[9px] text-slate-400 block">Resistencia / RPM</label>
                              <input
                                type="text"
                                placeholder="Ej: Nivel 6 / 80 RPM"
                                value={ej.intensidad_nivel || ""}
                                onChange={(e) => handleUpdateEjercicioParam(ejIdx, "intensidad_nivel", e.target.value)}
                                className="w-28 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-center text-xs text-white placeholder:text-slate-600"
                              />
                            </div>

                            <div className="flex-1 min-w-[140px]">
                              <label className="text-[9px] text-slate-500 block">Instrucciones / Cadencia</label>
                              <input
                                type="text"
                                value={ej.notas || ""}
                                onChange={(e) => handleUpdateEjercicioParam(ejIdx, "notas", e.target.value)}
                                placeholder="Ej: Mantener cadencia constante..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setModifyingExerciseIdx(ejIdx);
                                  setShowVoiceModal(true);
                                }}
                                className="text-rose-400 hover:text-rose-300 p-1.5 bg-slate-900 rounded-lg border border-slate-800 hover:border-rose-500/50 transition-colors"
                                title="Modificar con voz"
                              >
                                <Mic className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setReplacingExerciseIdx(ejIdx);
                                  setShowExercisePicker(true);
                                }}
                                className="text-indigo-400 hover:text-indigo-300 p-1.5 bg-slate-900 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors"
                                title="Cambiar ejercicio manualmente"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEliminarEjercicio(ejIdx)}
                                className="text-slate-500 hover:text-red-400 p-1.5 bg-slate-900 rounded-lg border border-slate-800 transition-colors"
                                title="Eliminar ejercicio"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3 text-xs w-full sm:w-auto">
                            <div>
                              <label className="text-[9px] text-slate-500 block">Series</label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={ej.series || 4}
                                onChange={(e) => handleUpdateEjercicioParam(ejIdx, "series", parseInt(e.target.value) || 4)}
                                className="w-14 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-center font-bold text-white"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] text-slate-500 block">Reps (ej: 12-10-8)</label>
                              <input
                                type="text"
                                value={Array.isArray(ej.repeticiones) ? ej.repeticiones.join("-") : ej.repeticiones || "10"}
                                onChange={(e) =>
                                  handleUpdateEjercicioParam(
                                    ejIdx,
                                    "repeticiones",
                                    e.target.value.split("-").map((n) => parseInt(n.trim()) || 10)
                                  )
                                }
                                className="w-24 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-center font-bold text-white"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] text-slate-500 block">Descanso (seg)</label>
                              <input
                                type="number"
                                step="15"
                                value={ej.descanso_seg || 90}
                                onChange={(e) =>
                                  handleUpdateEjercicioParam(ejIdx, "descanso_seg", parseInt(e.target.value) || 90)
                                }
                                className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-center text-xs text-white"
                              />
                            </div>

                            <div className="flex-1 min-w-[140px]">
                              <label className="text-[9px] text-slate-500 block">Notas de Técnica / RIR</label>
                              <input
                                type="text"
                                value={ej.notas || ""}
                                onChange={(e) => handleUpdateEjercicioParam(ejIdx, "notas", e.target.value)}
                                placeholder="Ej: RIR 2, pausa abajo..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setModifyingExerciseIdx(ejIdx);
                                  setShowVoiceModal(true);
                                }}
                                className="text-rose-400 hover:text-rose-300 p-1.5 bg-slate-900 rounded-lg border border-slate-800 hover:border-rose-500/50 transition-colors"
                                title="Modificar con voz"
                              >
                                <Mic className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setReplacingExerciseIdx(ejIdx);
                                  setShowExercisePicker(true);
                                }}
                                className="text-indigo-400 hover:text-indigo-300 p-1.5 bg-slate-900 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors"
                                title="Cambiar ejercicio manualmente"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEliminarEjercicio(ejIdx)}
                                className="text-slate-500 hover:text-red-400 p-1.5 bg-slate-900 rounded-lg border border-slate-800 transition-colors"
                                title="Eliminar ejercicio"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(rutinaEditando.estructura_json[selectedDiaIdx].ejercicios || []).length === 0 && (
                    <div className="text-center py-10 border border-slate-800 border-dashed rounded-2xl bg-slate-950/40">
                      <p className="text-xs text-slate-500">Este día no tiene ejercicios asignados aún.</p>
                      <button
                        onClick={() => setShowExercisePicker(true)}
                        className="mt-3 text-xs text-indigo-400 font-bold hover:underline"
                      >
                        + Abrir catálogo de ejercicios
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Footer del Editor con Guardar */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-400">
                {rutinaEditando.cliente_id
                  ? `👤 Se guardará asignada al alumno seleccionado.`
                  : `📚 Se guardará en tu banco de plantillas.`}
              </span>

              <div className="flex items-center gap-2">
                <BotonDescargaRutinaPDF
                  rutina={rutinaEditando}
                  label="PDF con Videos"
                />
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarRutina}
                  disabled={savingRutina}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all"
                >
                  {savingRutina ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {savingRutina ? "Guardando..." : "Guardar Rutina"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Picker de Ejercicios */}
      {showExercisePicker && (
        <ExercisePicker
          isOpen={showExercisePicker}
          onClose={() => setShowExercisePicker(false)}
          onSelect={handleSelectExercise}
          ejerciciosGlobales={ejerciciosGlobales}
          ejerciciosCoach={ejerciciosCoach}
        />
      )}
      {/* ========================================================= */}
      {/* MODAL 6: PREVIEW DE EJERCICIO 👀 */}
      {/* ========================================================= */}
      {previewEjercicio && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
              {previewEjercicio.video_demo_url ? (
                <video src={previewEjercicio.video_demo_url} controls autoPlay loop className="w-full h-full object-cover" />
              ) : previewEjercicio.thumbnail_url ? (
                <img src={previewEjercicio.thumbnail_url} alt={previewEjercicio.nombre} className="w-full h-full object-cover" />
              ) : (
                <Dumbbell className="w-12 h-12 text-slate-600" />
              )}
              <button 
                onClick={() => setPreviewEjercicio(null)} 
                className="absolute top-3 right-3 bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <h4 className="font-bold text-white text-lg">{previewEjercicio.nombre}</h4>
                <p className="text-slate-400 text-xs mt-1">{previewEjercicio.grupo_muscular || "General"}</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setPreviewEjercicio(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setReplacingExerciseIdx(previewEjercicio.ejIdx);
                    setShowExercisePicker(true);
                    setPreviewEjercicio(null);
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Cambiar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
