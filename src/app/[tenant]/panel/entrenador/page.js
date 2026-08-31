import { getCoachRutinas, getCoachClientes } from "@/lib/coachUtils";
import { getAuthenticatedCoach } from "@/lib/supabaseAuth";
import { redirect } from "next/navigation";
import ModoEntrenadorView from "@/components/ModoEntrenadorView";

export const metadata = {
  title: "Modo Entrenador & Sobrecarga | Panel Coach",
};

export default async function PanelEntrenadorPage({ params }) {
  const { tenant } = await params;

  // Auth Guard: solo el coach dueño de este tenant puede acceder
  const auth = await getAuthenticatedCoach(tenant);
  if (!auth) {
    redirect("/auth/login");
  }

  const { coach } = auth;
  const coachId = coach.id;
  const nombreCoach = coach.nombre_marca || coach.nombre || `Coach ${tenant}`;

  const [rutinas, clientes] = await Promise.all([
    getCoachRutinas(coach.id),
    getCoachClientes(coach.id),
  ]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ModoEntrenadorView
        clientes={clientes}
        rutinas={rutinas}
        coachId={coachId}
        coachNombre={nombreCoach}
        coachTenant={tenant}
        colorPrimario={coach.color_primario || "#6366F1"}
      />
    </div>
  );
}
