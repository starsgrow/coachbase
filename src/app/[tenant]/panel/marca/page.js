import { getAuthenticatedCoach } from "@/lib/supabaseAuth";
import { getCoachBySlug } from "@/lib/coachUtils";
import { redirect } from "next/navigation";
import MarcaManager from "@/components/MarcaManager";

export const metadata = {
  title: "Mi Marca | Panel Coach",
};

export default async function MarcaPage({ params }) {
  const { tenant } = await params;
  
  // Auth Guard
  const auth = await getAuthenticatedCoach(tenant);
  if (!auth) {
    redirect("/auth/login");
  }

  // Obtenemos los datos frescos de la BD para popular el formulario
  const coachData = await getCoachBySlug(tenant);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <MarcaManager coachInicial={coachData} />
    </div>
  );
}
