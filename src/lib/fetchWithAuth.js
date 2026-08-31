import { supabase } from './supabaseClient';

/**
 * Wrapper de fetch autenticado para componentes client-side.
 * Obtiene el token de sesión actual de Supabase y lo inyecta
 * como header Authorization: Bearer <token>.
 * 
 * @param {string} url - URL del endpoint
 * @param {RequestInit} options - Opciones de fetch estándar
 * @returns {Promise<Response>}
 */
export async function fetchWithAuth(url, options = {}) {
  // Obtener la sesión actual
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = {
    ...options.headers,
  };

  // Solo agregar Content-Type si no es FormData (FormData maneja su propio content-type)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  // Agregar el token de autenticación si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Si el servidor responde 401, la sesión expiró
  if (response.status === 401) {
    console.warn('Sesión expirada o no autorizada. Redirigiendo al login...');
    // Intentar refrescar la sesión
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      window.location.href = '/auth/login';
      throw new Error('Sesión expirada');
    }
    // Reintentar con el token refrescado
    const { data: { session: newSession } } = await supabase.auth.getSession();
    if (newSession?.access_token) {
      headers['Authorization'] = `Bearer ${newSession.access_token}`;
      return fetch(url, { ...options, headers });
    }
    window.location.href = '/auth/login';
    throw new Error('Sesión expirada');
  }

  return response;
}
