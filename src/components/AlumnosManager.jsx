"use client";

import { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Shield,
  Activity,
  Calendar,
  Dumbbell,
  AlertTriangle,
  Heart,
  Award,
  Sparkles,
  Flame,
  MessageCircle,
  FileText,
  UserCheck,
  Clock,
  ChevronRight,
  X,
  Target,
  Ruler,
  TrendingDown,
  TrendingUp,
  Save,
  CheckCircle2,
  BarChart2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

export default function AlumnosManager({ clientesIniciales = [], rutinasDisponibles = [], coachId, tenant = "olympocoach" }) {
  const [clientes, setClientes] = useState(clientesIniciales || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos"); // 'todos' | 'activos' | 'por_vencer' | 'inactivos'
  const [filterObjetivo, setFilterObjetivo] = useState("todos");

  // Modal State Ficha Alumno
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("contacto"); // 'contacto' | 'antropometria' | 'rutina' | 'notas' | 'medidas'
  const [editingCliente, setEditingCliente] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Toma de Medidas Específico
  const [isMedidasModalOpen, setIsMedidasModalOpen] = useState(false);
  const [clienteMedidas, setClienteMedidas] = useState(null);
  const [isSavingMedida, setIsSavingMedida] = useState(false);

  const initialMedidaForm = {
    fecha: new Date().toISOString().slice(0, 10),
    peso_kg: "",
    altura_cm: "",
    grasa_corporal: "",
    pecho_cm: "",
    cintura_cm: "",
    cadera_gluteo_cm: "",
    brazo_der_cm: "",
    brazo_izq_cm: "",
    muslo_der_cm: "",
    muslo_izq_cm: "",
    pantorrilla_cm: "",
    hombros_cm: "",
    anotaciones: ""
  };

  const [medidaForm, setMedidaForm] = useState(initialMedidaForm);

  const initialForm = {
    nombre: "",
    email: "",
    telefono: "",
    estado: "activo",
    objetivo: "Hipertrofia",
    nivel: "Intermedio",
    peso_kg: "",
    altura_cm: "",
    grasa_corporal: "",
    tiene_masa_muscular_alta: false,
    lesiones: "",
    rutina_activa_id: "",
    rutina_nombre: "",
    plan_suscripcion: "Mensual",
    fecha_vencimiento: "",
    calorias_meta: "",
    proteinas_meta: "",
    carbohidratos_meta: "",
    grasas_meta: "",
    notas_privadas: "",
    historial_medidas: []
  };

  const [formData, setFormData] = useState(initialForm);

  // Calcular IMC
  const calcularIMC = (peso, altura) => {
    const p = parseFloat(peso);
    const a = parseFloat(altura);
    if (!p || !a || a <= 0) return null;
    const hMetros = a / 100;
    const imc = p / (hMetros * hMetros);
    return Math.round(imc * 10) / 10;
  };

  // Calcular días restantes para vencimiento
  const getSubscriptionInfo = (fechaVencimiento, estado) => {
    if (estado === "inactivo") {
      return { status: "inactivo", label: "Inactivo", color: "bg-red-500/10 text-red-400 border-red-500/20" };
    }
    if (!fechaVencimiento) {
      return { status: "activo", label: "Activo", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(fechaVencimiento);
    expDate.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: "vencido", label: `Vencido (${Math.abs(diffDays)}d)`, color: "bg-rose-500/15 text-rose-400 border-rose-500/30" };
    }
    if (diffDays <= 5) {
      return { status: "por_vencer", label: `Vence en ${diffDays}d`, color: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
    }
    return { status: "activo", label: `Al día (${diffDays}d)`, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  };

  // Filtrado de clientes
  const filteredClientes = clientes.filter((c) => {
    const matchesSearch =
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.telefono && c.telefono.includes(searchTerm)) ||
      (c.objetivo && c.objetivo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      filterStatus === "todos"
        ? true
        : filterStatus === "activos"
        ? c.estado === "activo"
        : filterStatus === "inactivos"
        ? c.estado === "inactivo"
        : filterStatus === "por_vencer"
        ? getSubscriptionInfo(c.fecha_vencimiento, c.estado).status === "por_vencer" || getSubscriptionInfo(c.fecha_vencimiento, c.estado).status === "vencido"
        : true;

    const matchesObjetivo =
      filterObjetivo === "todos" ? true : c.objetivo === filterObjetivo;

    return matchesSearch && matchesStatus && matchesObjetivo;
  });

  // Métricas rápidas
  const totalAlumnos = clientes.length;
  const alumnosActivos = clientes.filter((c) => c.estado === "activo").length;
  const alumnosPorVencer = clientes.filter((c) => {
    const s = getSubscriptionInfo(c.fecha_vencimiento, c.estado);
    return s.status === "por_vencer" || s.status === "vencido";
  }).length;
  const alumnosConRutina = clientes.filter((c) => c.rutina_activa_id || c.rutina_nombre).length;

  const handleOpenModal = (cliente = null) => {
    setActiveTab("contacto");
    if (cliente) {
      setEditingCliente(cliente);
      setFormData({
        nombre: cliente.nombre || "",
        email: cliente.email || "",
        telefono: cliente.telefono || "",
        estado: cliente.estado || "activo",
        objetivo: cliente.objetivo || "Hipertrofia",
        nivel: cliente.nivel || "Intermedio",
        peso_kg: cliente.peso_kg || "",
        altura_cm: cliente.altura_cm || "",
        grasa_corporal: cliente.grasa_corporal || "",
        tiene_masa_muscular_alta: Boolean(
          cliente.tiene_masa_muscular_alta ||
          cliente.es_avanzado ||
          cliente.nivel === "Avanzado" ||
          cliente.nivel === "Competidor"
        ),
        lesiones: cliente.lesiones || "",
        rutina_activa_id: cliente.rutina_activa_id || "",
        rutina_nombre: cliente.rutina_nombre || "",
        plan_suscripcion: cliente.plan_suscripcion || "Mensual",
        fecha_vencimiento: cliente.fecha_vencimiento ? cliente.fecha_vencimiento.slice(0, 10) : "",
        calorias_meta: cliente.calorias_meta || "",
        proteinas_meta: cliente.proteinas_meta || "",
        carbohidratos_meta: cliente.carbohidratos_meta || "",
        grasas_meta: cliente.grasas_meta || "",
        notas_privadas: cliente.notas_privadas || "",
        historial_medidas: Array.isArray(cliente.historial_medidas) ? cliente.historial_medidas : []
      });
    } else {
      setEditingCliente(null);
      setFormData(initialForm);
    }
    setIsModalOpen(true);
  };

  const handleOpenMedidasModal = (cliente) => {
    setClienteMedidas(cliente);
    setMedidaForm({
      fecha: new Date().toISOString().slice(0, 10),
      peso_kg: cliente.peso_kg || "",
      altura_cm: cliente.altura_cm || "",
      grasa_corporal: cliente.grasa_corporal || "",
      pecho_cm: "",
      cintura_cm: "",
      cadera_gluteo_cm: "",
      brazo_der_cm: "",
      brazo_izq_cm: "",
      muslo_der_cm: "",
      muslo_izq_cm: "",
      pantorrilla_cm: "",
      hombros_cm: "",
      anotaciones: ""
    });
    setIsMedidasModalOpen(true);
  };

  const handleRutinaSelect = (rutinaId) => {
    if (!rutinaId) {
      setFormData((prev) => ({ ...prev, rutina_activa_id: "", rutina_nombre: "" }));
      return;
    }
    const rut = rutinasDisponibles.find((r) => r.id === rutinaId);
    setFormData((prev) => ({
      ...prev,
      rutina_activa_id: rutinaId,
      rutina_nombre: rut ? (rut.nombre || rut.titulo || "Rutina Personalizada") : ""
    }));
  };

  // Guardar ficha general del alumno
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;
    setIsSubmitting(true);

    try {
      const payload = { ...formData, coach_id: coachId };
      if (editingCliente) payload.id = editingCliente.id;

      const res = await fetchWithAuth("/api/alumnos/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Error al guardar el alumno");

      const savedCliente = await res.json();

      if (editingCliente) {
        setClientes(clientes.map((c) => (c.id === savedCliente.id ? savedCliente : c)));
      } else {
        setClientes([savedCliente, ...clientes]);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Hubo un error al guardar el alumno: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guardar nueva medición en el historial del alumno
  const handleGuardarMedicion = async (e) => {
    e.preventDefault();
    if (!clienteMedidas) return;
    setIsSavingMedida(true);

    try {
      const imcCalculado = calcularIMC(medidaForm.peso_kg || clienteMedidas.peso_kg, medidaForm.altura_cm || clienteMedidas.altura_cm);

      const nuevaMedicion = {
        id: `med-${Date.now()}`,
        fecha: medidaForm.fecha || new Date().toISOString().slice(0, 10),
        peso_kg: medidaForm.peso_kg ? parseFloat(medidaForm.peso_kg) : null,
        altura_cm: medidaForm.altura_cm ? parseFloat(medidaForm.altura_cm) : null,
        grasa_corporal: medidaForm.grasa_corporal ? parseFloat(medidaForm.grasa_corporal) : null,
        imc: imcCalculado,
        pecho_cm: medidaForm.pecho_cm ? parseFloat(medidaForm.pecho_cm) : null,
        cintura_cm: medidaForm.cintura_cm ? parseFloat(medidaForm.cintura_cm) : null,
        cadera_gluteo_cm: medidaForm.cadera_gluteo_cm ? parseFloat(medidaForm.cadera_gluteo_cm) : null,
        brazo_der_cm: medidaForm.brazo_der_cm ? parseFloat(medidaForm.brazo_der_cm) : null,
        brazo_izq_cm: medidaForm.brazo_izq_cm ? parseFloat(medidaForm.brazo_izq_cm) : null,
        muslo_der_cm: medidaForm.muslo_der_cm ? parseFloat(medidaForm.muslo_der_cm) : null,
        muslo_izq_cm: medidaForm.muslo_izq_cm ? parseFloat(medidaForm.muslo_izq_cm) : null,
        pantorrilla_cm: medidaForm.pantorrilla_cm ? parseFloat(medidaForm.pantorrilla_cm) : null,
        hombros_cm: medidaForm.hombros_cm ? parseFloat(medidaForm.hombros_cm) : null,
        anotaciones: medidaForm.anotaciones || ""
      };

      const historialPrevio = Array.isArray(clienteMedidas.historial_medidas) ? clienteMedidas.historial_medidas : [];
      const historialActualizado = [nuevaMedicion, ...historialPrevio];

      // Actualizar también los valores vigentes del alumno
      const payload = {
        ...clienteMedidas,
        peso_kg: nuevaMedicion.peso_kg || clienteMedidas.peso_kg,
        altura_cm: nuevaMedicion.altura_cm || clienteMedidas.altura_cm,
        grasa_corporal: nuevaMedicion.grasa_corporal || clienteMedidas.grasa_corporal,
        historial_medidas: historialActualizado,
        coach_id: coachId
      };

      const res = await fetchWithAuth("/api/alumnos/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Error al guardar medición");
      const saved = await res.json();

      setClientes((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      setClienteMedidas(saved);
      setMedidaForm(initialMedidaForm);
      alert("📏 ¡Toma de medidas registrada con éxito!");
    } catch (err) {
      console.error(err);
      alert("Error al registrar medidas: " + err.message);
    } finally {
      setIsSavingMedida(false);
    }
  };

  const handleDeleteMedicion = async (medicionId) => {
    if (!clienteMedidas || !confirm("¿Eliminar este registro de medidas?")) return;

    try {
      const historialFiltrado = (clienteMedidas.historial_medidas || []).filter((m) => m.id !== medicionId);

      const payload = {
        ...clienteMedidas,
        historial_medidas: historialFiltrado,
        coach_id: coachId
      };

      const res = await fetchWithAuth("/api/alumnos/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Error al eliminar medición");
      const saved = await res.json();

      setClientes((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      setClienteMedidas(saved);
    } catch (err) {
      console.error(err);
      alert("Error eliminando registro: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este alumno? Se borrarán sus datos, medidas y asignación.")) return;

    try {
      const res = await fetchWithAuth(`/api/alumnos/eliminar?id=${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Error al eliminar");

      setClientes(clientes.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar el alumno.");
    }
  };

  // Enlace directo de WhatsApp
  const getWhatsAppLink = (telefono, nombre) => {
    if (!telefono) return null;
    const cleanPhone = telefono.replace(/[^0-9]/g, "");
    const msg = encodeURIComponent(`¡Hola ${nombre}! Te contacto desde tu plataforma de entrenamiento.`);
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  };

  // Compartir evolución de medidas por WhatsApp
  const handleShareMedidasWhatsApp = (cliente) => {
    if (!cliente) return;
    const historial = cliente.historial_medidas || [];
    if (historial.length === 0) return alert("El alumno aún no tiene medidas registradas.");

    const ultima = historial[0];
    const previa = historial[1];

    let msg = `📏 *REGISTRO ANTROPOMÉTRICO Y MEDIDAS*\n`;
    msg += `👤 *Atleta:* ${cliente.nombre}\n`;
    msg += `📅 *Fecha:* ${ultima.fecha}\n\n`;
    msg += `⚖️ *Peso:* ${ultima.peso_kg ? `${ultima.peso_kg} kg` : "—"}${
      previa?.peso_kg ? ` (${(ultima.peso_kg - previa.peso_kg).toFixed(1)} kg)` : ""
    }\n`;
    msg += `📊 *% Grasa:* ${ultima.grasa_corporal ? `${ultima.grasa_corporal}%` : "—"}\n`;
    if (ultima.imc) msg += `🎯 *IMC:* ${ultima.imc}\n`;

    msg += `\n📐 *CIRCUNFERENCIAS (cm):*\n`;
    if (ultima.pecho_cm) msg += `• Pecho: ${ultima.pecho_cm} cm\n`;
    if (ultima.cintura_cm) msg += `• Cintura: ${ultima.cintura_cm} cm${previa?.cintura_cm ? ` (${(ultima.cintura_cm - previa.cintura_cm).toFixed(1)} cm)` : ""}\n`;
    if (ultima.cadera_gluteo_cm) msg += `• Cadera/Glúteo: ${ultima.cadera_gluteo_cm} cm\n`;
    if (ultima.brazo_der_cm) msg += `• Brazo Der: ${ultima.brazo_der_cm} cm | Brazo Izq: ${ultima.brazo_izq_cm || ultima.brazo_der_cm} cm\n`;
    if (ultima.muslo_der_cm) msg += `• Muslo Der: ${ultima.muslo_der_cm} cm | Muslo Izq: ${ultima.muslo_izq_cm || ultima.muslo_der_cm} cm\n`;
    if (ultima.pantorrilla_cm) msg += `• Pantorrilla: ${ultima.pantorrilla_cm} cm\n`;

    if (ultima.anotaciones) {
      msg += `\n📝 *Notas del Coach:* ${ultima.anotaciones}\n`;
    }

    const cleanPhone = cliente.telefono ? cliente.telefono.replace(/[^0-9]/g, "") : "";
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Botón Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-400" />
            Gestión de Alumnos & Atletas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Fichas antropométricas, toma de medidas periódicas, rutinas activas y seguimiento de pagos.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Nuevo Alumno
        </button>
      </div>

      {/* Barra de Estadísticas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{totalAlumnos}</div>
            <div className="text-[11px] text-slate-400 font-medium">Total Alumnos</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400">{alumnosActivos}</div>
            <div className="text-[11px] text-slate-400 font-medium">Alumnos Activos</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400">{alumnosPorVencer}</div>
            <div className="text-[11px] text-slate-400 font-medium">Por Vencer / Vencidos</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-sky-400">{alumnosConRutina}</div>
            <div className="text-[11px] text-slate-400 font-medium">Con Rutina Asignada</div>
          </div>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o teléfono..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtros de Estado */}
          <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              onClick={() => setFilterStatus("todos")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterStatus === "todos" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus("activos")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterStatus === "activos" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setFilterStatus("por_vencer")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterStatus === "por_vencer" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Por Vencer
            </button>
            <button
              onClick={() => setFilterStatus("inactivos")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterStatus === "inactivos" ? "bg-rose-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Inactivos
            </button>
          </div>

          {/* Filtro de Objetivo */}
          <select
            value={filterObjetivo}
            onChange={(e) => setFilterObjetivo(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="todos">Todos los Objetivos</option>
            <option value="Hipertrofia">🎯 Hipertrofia</option>
            <option value="Pérdida de Grasa">🔥 Pérdida de Grasa</option>
            <option value="Fuerza">⚡ Fuerza</option>
            <option value="Salud">❤️ Salud & Recomposición</option>
          </select>
        </div>
      </div>

      {/* Grid de Tarjetas de Alumnos */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClientes.map((cliente) => {
          const subInfo = getSubscriptionInfo(cliente.fecha_vencimiento, cliente.estado);
          const waLink = getWhatsAppLink(cliente.telefono, cliente.nombre);
          const numMedidas = Array.isArray(cliente.historial_medidas) ? cliente.historial_medidas.length : 0;
          const ultimaMedida = numMedidas > 0 ? cliente.historial_medidas[0] : null;

          return (
            <div
              key={cliente.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 transition-all shadow-lg flex flex-col justify-between group"
            >
              {/* Header de la Tarjeta */}
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-indigo-500/20 to-sky-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl flex items-center justify-center font-black text-lg shadow-inner">
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-base line-clamp-1 group-hover:text-indigo-300 transition-colors">
                        {cliente.nombre}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${subInfo.color}`}>
                          {subInfo.label}
                        </span>
                        <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md text-[10px] font-medium">
                          {cliente.plan_suscripcion || "Mensual"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenMedidasModal(cliente)}
                      className="p-1.5 text-sky-400 hover:text-white bg-sky-500/10 hover:bg-sky-600 rounded-lg transition-colors border border-sky-500/20"
                      title="Tomar / Ver Medidas Antropométricas"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenModal(cliente)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 bg-slate-950/80 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Editar Ficha Completa"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cliente.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-950/80 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Eliminar Alumno"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Badges de Objetivo & Nivel */}
                <div className="flex flex-wrap gap-1.5 mb-3.5">
                  <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1">
                    <Target className="w-3 h-3" /> {cliente.objetivo || "Hipertrofia"}
                  </span>
                  <span className="bg-slate-800/80 text-slate-300 px-2.5 py-0.5 rounded-lg text-xs font-medium">
                    ⚡ {cliente.nivel || "Intermedio"}
                  </span>
                  {numMedidas > 0 && (
                    <span className="bg-sky-500/10 border border-sky-500/20 text-sky-300 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
                      <Ruler className="w-2.5 h-2.5" /> {numMedidas} {numMedidas === 1 ? "control" : "controles"}
                    </span>
                  )}
                </div>

                {/* Métricas Antropométricas Vigentes */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 mb-3.5 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Peso</div>
                    <div className="text-xs font-extrabold text-white">
                      {cliente.peso_kg ? `${cliente.peso_kg} kg` : "—"}
                    </div>
                  </div>
                  <div className="border-x border-slate-800/80">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Altura</div>
                    <div className="text-xs font-extrabold text-white">
                      {cliente.altura_cm ? `${cliente.altura_cm} cm` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">% Grasa</div>
                    <div className="text-xs font-extrabold text-white">
                      {cliente.grasa_corporal ? `${cliente.grasa_corporal}%` : "—"}
                    </div>
                  </div>
                </div>

                {/* Rutina Asignada */}
                <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-2.5 mb-3.5 flex items-center gap-2.5">
                  <Dumbbell className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Rutina Asignada</div>
                    <div className="text-xs font-bold text-slate-200 truncate">
                      {cliente.rutina_nombre || (cliente.rutina_activa_id ? "Rutina Personalizada" : "Sin rutina activa")}
                    </div>
                  </div>
                </div>

                {/* Alerta de Lesiones (si tiene) */}
                {cliente.lesiones && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 mb-3.5 flex items-start gap-2 text-[11px] text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">
                      <strong>Cuidado:</strong> {cliente.lesiones}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer de Tarjeta con Botón de Medidas, Entrenar y Contacto */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1.5 text-xs flex-wrap">
                <Link
                  href={`/${tenant}/panel/entrenador`}
                  className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1"
                  title="Abrir Modo Entrenador para este alumno"
                >
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> Entrenar
                </Link>

                <button
                  onClick={() => handleOpenMedidasModal(cliente)}
                  className="bg-slate-800 hover:bg-sky-600/20 text-slate-300 hover:text-sky-300 border border-slate-700 hover:border-sky-500/30 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1"
                >
                  <Ruler className="w-3 h-3 text-sky-400" /> Medidas ({numMedidas})
                </button>

                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white px-2 py-1.5 rounded-lg font-bold text-[11px] border border-emerald-500/30 transition-all flex items-center gap-1 flex-shrink-0"
                    title="Enviar WhatsApp"
                  >
                    <MessageCircle className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}

        {filteredClientes.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl p-6">
            <Shield className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-lg font-bold text-white">No se encontraron alumnos</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchTerm ? "Intenta con otros términos o filtros." : "Añade a tu primer alumno para gestionar sus rutinas y medidas."}
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow"
            >
              + Agregar Alumno
            </button>
          </div>
        )}
      </div>

      {/* MODAL 1: FICHA COMPLETA DEL ALUMNO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  {editingCliente ? `Ficha de ${editingCliente.nombre}` : "Nuevo Alumno"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configura los datos de entrenamiento, suscripción y notas del atleta.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Navigation */}
            <div className="flex border-b border-slate-800 bg-slate-950/80 px-6 gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("contacto")}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "contacto"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Contacto & Plan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("antropometria")}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "antropometria"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Target className="w-3.5 h-3.5" /> Ficha & Salud
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rutina")}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "rutina"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Dumbbell className="w-3.5 h-3.5" /> Rutina & Macros
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("notas")}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "notas"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Notas Privadas
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* TAB 1: CONTACTO Y PLAN */}
              {activeTab === "contacto" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Ej: Carlos Mendoza"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Correo Electrónico</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="carlos@gmail.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Teléfono / WhatsApp</label>
                      <input
                        type="tel"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="+52 55 1234 5678"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Estado</label>
                      <select
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="activo">🟢 Activo</option>
                        <option value="inactivo">🔴 Inactivo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Plan de Asesoría</label>
                      <select
                        value={formData.plan_suscripcion}
                        onChange={(e) => setFormData({ ...formData, plan_suscripcion: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Mensual">Plan Mensual</option>
                        <option value="Trimestral">Plan Trimestral</option>
                        <option value="Semestral">Plan Semestral</option>
                        <option value="Anual">Plan Anual</option>
                        <option value="VIP 1 a 1">Asesoría VIP 1 a 1</option>
                        <option value="Personalizado">Personalizado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Vencimiento / Renovación</label>
                      <input
                        type="date"
                        value={formData.fecha_vencimiento}
                        onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ANTROPOMETRIA Y SALUD */}
              {activeTab === "antropometria" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Objetivo Principal</label>
                      <select
                        value={formData.objetivo}
                        onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Hipertrofia">🎯 Hipertrofia (Aumento Masa Muscular)</option>
                        <option value="Pérdida de Grasa">🔥 Definición (Pérdida de Grasa)</option>
                        <option value="Fuerza">⚡ Fuerza / Powerlifting</option>
                        <option value="Salud">❤️ Salud & Recomposición Corporal</option>
                        <option value="Rendimiento Deportivo">🏃 Rendimiento Deportivo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Nivel de Experiencia</label>
                      <select
                        value={formData.nivel}
                        onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Principiante">Principiante (&lt; 1 año)</option>
                        <option value="Intermedio">Intermedio (1 a 3 años)</option>
                        <option value="Avanzado">Avanzado (+3 años)</option>
                        <option value="Competidor">Atleta / Competidor</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3.5 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Peso Actual (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.peso_kg}
                        onChange={(e) => setFormData({ ...formData, peso_kg: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Ej: 75.5"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Altura (cm)</label>
                      <input
                        type="number"
                        value={formData.altura_cm}
                        onChange={(e) => setFormData({ ...formData, altura_cm: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Ej: 178"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">% Grasa Estimado</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.grasa_corporal}
                        onChange={(e) => setFormData({ ...formData, grasa_corporal: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Ej: 15.0"
                      />
                    </div>
                  </div>

                  {/* Switch Masa Muscular Alta / Atleta Avanzado */}
                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" /> Atleta con Masa Muscular Alta / Avanzado
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Si su IMC supera 25 debido a densidad muscular, el sistema lo tratará como <strong className="text-emerald-400">Normopeso</strong> (cardio 60-90 min para hipertrofia, no para pérdida de peso).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tiene_masa_muscular_alta: !formData.tiene_masa_muscular_alta })}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                        formData.tiene_masa_muscular_alta ? "bg-indigo-600" : "bg-slate-800"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          formData.tiene_masa_muscular_alta ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Lesiones o Limitaciones Físicas
                    </label>
                    <textarea
                      rows={2}
                      value={formData.lesiones}
                      onChange={(e) => setFormData({ ...formData, lesiones: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      placeholder="Ej: Molestia en rodilla izquierda en flexión profunda, hernia L5-S1 (evitar cargas axiales pesadas)..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: RUTINA Y MACROS */}
              {activeTab === "rutina" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Dumbbell className="w-3.5 h-3.5 text-indigo-400" /> Asignar Rutina Activa
                    </label>
                    <select
                      value={formData.rutina_activa_id}
                      onChange={(e) => handleRutinaSelect(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">— Sin Rutina Asignada —</option>
                      {rutinasDisponibles.map((r) => (
                        <option key={r.id} value={r.id}>
                          🏋️ {r.nombre || r.titulo || "Rutina"} {r.dificultad ? `(${r.dificultad})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-300 mb-2">Metas Nutricionales Diarias (Macros)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Calorías (kcal)</span>
                        <input
                          type="number"
                          value={formData.calorias_meta}
                          onChange={(e) => setFormData({ ...formData, calorias_meta: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                          placeholder="2400"
                        />
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-emerald-400 uppercase">Proteína (g)</span>
                        <input
                          type="number"
                          value={formData.proteinas_meta}
                          onChange={(e) => setFormData({ ...formData, proteinas_meta: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                          placeholder="160"
                        />
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-sky-400 uppercase">Carbohidratos (g)</span>
                        <input
                          type="number"
                          value={formData.carbohidratos_meta}
                          onChange={(e) => setFormData({ ...formData, carbohidratos_meta: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                          placeholder="280"
                        />
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-amber-400 uppercase">Grasas (g)</span>
                        <input
                          type="number"
                          value={formData.grasas_meta}
                          onChange={(e) => setFormData({ ...formData, grasas_meta: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mt-1"
                          placeholder="65"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: NOTAS PRIVADAS */}
              {activeTab === "notas" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" /> Bitácora y Notas Confidenciales del Coach
                    </label>
                    <textarea
                      rows={6}
                      value={formData.notas_privadas}
                      onChange={(e) => setFormData({ ...formData, notas_privadas: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-indigo-500 leading-relaxed font-mono"
                      placeholder="Escribe aquí notas sobre llamadas de revisión, progresos en cargas, sensaciones del alumno, feedback de técnica o recordatorios..."
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      🔒 Estas notas solo son visibles por ti en el panel de coach.
                    </p>
                  </div>
                </div>
              )}

              {/* Footer con Acciones */}
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                >
                  {isSubmitting ? "Guardando..." : "Guardar Ficha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TOMA DE MEDIDAS & HISTORIAL ANTROPOMÉTRICO */}
      {isMedidasModalOpen && clienteMedidas && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header Modal Medidas */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-sky-400" />
                  Control Antropométrico • {clienteMedidas.nombre}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registro periódico de peso, grasa corporal y circunferencias corporales.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShareMedidasWhatsApp(clienteMedidas)}
                  className="p-2 text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 rounded-xl border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Compartir última evolución por WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
                <button
                  onClick={() => setIsMedidasModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido Modal Medidas */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Formulario Nueva Toma de Medidas */}
              <form onSubmit={handleGuardarMedicion} className="bg-slate-950 border border-slate-800 rounded-2xl p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Registrar Nueva Medición
                  </h3>
                  <input
                    type="date"
                    required
                    value={medidaForm.fecha}
                    onChange={(e) => setMedidaForm({ ...medidaForm, fecha: e.target.value })}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Datos Básicos */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Peso (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={medidaForm.peso_kg}
                      onChange={(e) => setMedidaForm({ ...medidaForm, peso_kg: e.target.value })}
                      placeholder="75.5"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-sky-500 mt-1"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Altura (cm)</label>
                    <input
                      type="number"
                      value={medidaForm.altura_cm}
                      onChange={(e) => setMedidaForm({ ...medidaForm, altura_cm: e.target.value })}
                      placeholder="178"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 mt-1"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">% Grasa</label>
                    <input
                      type="number"
                      step="0.1"
                      value={medidaForm.grasa_corporal}
                      onChange={(e) => setMedidaForm({ ...medidaForm, grasa_corporal: e.target.value })}
                      placeholder="14.5"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 mt-1"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">IMC (Auto)</label>
                    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-sky-400 font-black mt-1">
                      {calcularIMC(medidaForm.peso_kg || clienteMedidas.peso_kg, medidaForm.altura_cm || clienteMedidas.altura_cm) || "—"}
                    </div>
                  </div>
                </div>

                {/* Circunferencias Corporales */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-2">Circunferencias Corporales (cm)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <span className="block text-[10px] text-slate-500">Pecho / Tórax</span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="102.0"
                        value={medidaForm.pecho_cm}
                        onChange={(e) => setMedidaForm({ ...medidaForm, pecho_cm: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white mt-0.5"
                      />
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-500">Cintura</span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="82.0"
                        value={medidaForm.cintura_cm}
                        onChange={(e) => setMedidaForm({ ...medidaForm, cintura_cm: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white mt-0.5"
                      />
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-500">Cadera / Glúteo</span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="98.5"
                        value={medidaForm.cadera_gluteo_cm}
                        onChange={(e) => setMedidaForm({ ...medidaForm, cadera_gluteo_cm: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white mt-0.5"
                      />
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-500">Hombros</span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="118.0"
                        value={medidaForm.hombros_cm}
                        onChange={(e) => setMedidaForm({ ...medidaForm, hombros_cm: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white mt-0.5"
                      />
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-500">Brazo Derecho</span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="38.5"
                        value={medidaForm.brazo_der_cm}
                        onChange={(e) => setMedidaForm({ ...medidaForm, brazo_der_cm: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white mt-0.5"
                      />
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-500">Brazo Izquierdo</span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="38.0"
                        value={medidaForm.brazo_izq_cm}
                        onChange={(e) => setMedidaForm({ ...medidaForm, brazo_izq_cm: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white mt-0.5"
                      />
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-500">Muslo Derecho</span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="58.5"
                        value={medidaForm.muslo_der_cm}
                        onChange={(e) => setMedidaForm({ ...medidaForm, muslo_der_cm: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white mt-0.5"
                      />
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-500">Pantorrilla</span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="37.5"
                        value={medidaForm.pantorrilla_cm}
                        onChange={(e) => setMedidaForm({ ...medidaForm, pantorrilla_cm: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white mt-0.5"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Anotaciones del Control</label>
                  <input
                    type="text"
                    value={medidaForm.anotaciones}
                    onChange={(e) => setMedidaForm({ ...medidaForm, anotaciones: e.target.value })}
                    placeholder="Ej: Buena congestión, menos retención hídrica, fuerza en aumento..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingMedida}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingMedida ? "Guardando Medición..." : "➕ Guardar Medición"}
                </button>
              </form>

              {/* Historial Cronológico de Medidas */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-400" />
                  Historial de Mediciones ({clienteMedidas.historial_medidas?.length || 0})
                </h3>

                {(clienteMedidas.historial_medidas || []).map((med, mIdx) => {
                  const anterior = clienteMedidas.historial_medidas[mIdx + 1];
                  const diffPeso = anterior?.peso_kg && med.peso_kg ? (med.peso_kg - anterior.peso_kg).toFixed(1) : null;
                  const diffCintura = anterior?.cintura_cm && med.cintura_cm ? (med.cintura_cm - anterior.cintura_cm).toFixed(1) : null;

                  return (
                    <div
                      key={med.id || mIdx}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-400 font-bold text-[10px] flex items-center justify-center">
                            #{clienteMedidas.historial_medidas.length - mIdx}
                          </span>
                          <span className="text-xs font-extrabold text-white">{med.fecha}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {med.imc && (
                            <span className="bg-slate-800 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded">
                              IMC {med.imc}
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteMedicion(med.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                            title="Eliminar este control"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Métricas Principales */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs pt-1">
                        <div className="bg-slate-900/60 p-2 rounded-xl">
                          <span className="text-[9px] text-slate-500 font-bold block">Peso</span>
                          <span className="font-extrabold text-white">{med.peso_kg ? `${med.peso_kg} kg` : "—"}</span>
                          {diffPeso && (
                            <span
                              className={`text-[9px] font-bold block ${
                                parseFloat(diffPeso) < 0 ? "text-emerald-400" : "text-sky-400"
                              }`}
                            >
                              {parseFloat(diffPeso) > 0 ? `+${diffPeso}` : diffPeso} kg
                            </span>
                          )}
                        </div>

                        <div className="bg-slate-900/60 p-2 rounded-xl">
                          <span className="text-[9px] text-slate-500 font-bold block">% Grasa</span>
                          <span className="font-extrabold text-white">{med.grasa_corporal ? `${med.grasa_corporal}%` : "—"}</span>
                        </div>

                        <div className="bg-slate-900/60 p-2 rounded-xl">
                          <span className="text-[9px] text-slate-500 font-bold block">Cintura</span>
                          <span className="font-extrabold text-white">{med.cintura_cm ? `${med.cintura_cm} cm` : "—"}</span>
                          {diffCintura && (
                            <span
                              className={`text-[9px] font-bold block ${
                                parseFloat(diffCintura) < 0 ? "text-emerald-400" : "text-amber-400"
                              }`}
                            >
                              {parseFloat(diffCintura) > 0 ? `+${diffCintura}` : diffCintura} cm
                            </span>
                          )}
                        </div>

                        <div className="bg-slate-900/60 p-2 rounded-xl">
                          <span className="text-[9px] text-slate-500 font-bold block">Pecho</span>
                          <span className="font-bold text-slate-300">{med.pecho_cm ? `${med.pecho_cm} cm` : "—"}</span>
                        </div>

                        <div className="bg-slate-900/60 p-2 rounded-xl">
                          <span className="text-[9px] text-slate-500 font-bold block">Brazo Der</span>
                          <span className="font-bold text-slate-300">{med.brazo_der_cm ? `${med.brazo_der_cm} cm` : "—"}</span>
                        </div>

                        <div className="bg-slate-900/60 p-2 rounded-xl">
                          <span className="text-[9px] text-slate-500 font-bold block">Muslo Der</span>
                          <span className="font-bold text-slate-300">{med.muslo_der_cm ? `${med.muslo_der_cm} cm` : "—"}</span>
                        </div>
                      </div>

                      {med.anotaciones && (
                        <p className="text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded-xl italic">
                          "{med.anotaciones}"
                        </p>
                      )}
                    </div>
                  );
                })}

                {(!clienteMedidas.historial_medidas || clienteMedidas.historial_medidas.length === 0) && (
                  <div className="text-center py-6 text-xs text-slate-500 bg-slate-950 border border-slate-800 rounded-2xl">
                    Este alumno aún no tiene registros de medidas. Agrega el primer control arriba.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
