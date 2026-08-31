import { getAuthenticatedCoach } from "@/lib/supabaseAuth";
import { getCoachClientes, getCoachRutinas } from "@/lib/coachUtils";
import { redirect } from "next/navigation";
import AlumnosManager from "@/components/AlumnosManager";

export const metadata = {
  title: "Mis Alumnos | Panel Coach",
};

export default async function AlumnosPage({ params }) {
  const { tenant } = await params;
  
  // Auth Guard
  const auth = await getAuthenticatedCoach(tenant);
  if (!auth) {
    redirect("/auth/login");
  }

  const coachId = auth.coach?.id || auth.id;

  // Fetch initial data en paralelo
  const [clientes, rutinas] = await Promise.all([
    getCoachClientes(coachId),
    getCoachRutinas(coachId)
  ]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AlumnosManager clientesIniciales={clientes} rutinasDisponibles={rutinas} coachId={coachId} tenant={tenant} />
    </div>
  );
}
