/**
 * Determina las capacidades administrativas resueltas por Django y Keycloak.
 *
 * Nota: es una verificación de UX. El backend (DRF) sigue siendo la
 * autoridad real sobre quién puede editar un recurso.
 */
export function useEsAdmin() {
  const store = useAdministracionStore();
  const { status } = useAuth();

  const esAdmin = computed(() => store.perfilActual?.can_access_administration === true);

  async function cargarEsAdmin() {
    if (status.value === 'authenticated' && !store.perfilActual) {
      try {
        await store.cargarPerfilActual();
      } catch {
        // La navegación pública no debe fallar si el perfil no puede cargarse.
      }
    }
  }

  return { esAdmin, cargarEsAdmin };
}
