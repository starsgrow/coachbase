import alimentosData from "./alimentos.json";

export const CATALOGO_ALIMENTOS = alimentosData || [];

export const ALIMENTOS_MAP = new Map(CATALOGO_ALIMENTOS.map((a) => [a.id, a]));

/**
 * Busca alimentos por texto o categoría
 */
export function buscarAlimentos(query = "", categoria = "") {
  const q = (query || "").toLowerCase().trim();
  const cat = (categoria || "").toLowerCase().trim();

  return CATALOGO_ALIMENTOS.filter((a) => {
    const matchQuery =
      !q ||
      a.nombre.toLowerCase().includes(q) ||
      (a.categoria && a.categoria.toLowerCase().includes(q));
    const matchCat = !cat || (a.categoria && a.categoria.toLowerCase().includes(cat));
    return matchQuery && matchCat;
  });
}
