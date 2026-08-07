/**
 * Regla de publicación de mapas:
 * Un mapa solo puede ser público si TODAS sus capas están publicadas en el
 * catálogo (`dataset_is_published === true`). Si tiene al menos una capa no
 * publicada, no puede marcarse como público.
 *
 * Lee las capas del mapa activo en el store (`mapasStore.activeMap.layers`),
 * que se carga al editar/visualizar un mapa vía `mapasStore.cargarMapa(id)`.
 */
export function useMapaPublicable() {
  const mapasStore = useMapasStore();

  // Capas cuyo dataset NO está publicado en el catálogo (false o null/desconocido).
  const capasNoPublicas = computed(() =>
    (mapasStore.activeMap?.layers ?? []).filter(
      (capa: { dataset_is_published?: boolean }) => capa.dataset_is_published !== true
    )
  );

  // El mapa puede ser público solo si no hay capas sin publicar.
  const puedeSerPublico = computed(() => capasNoPublicas.value.length === 0);

  return { capasNoPublicas, puedeSerPublico };
}
