// perfil de color de esta instancia, vive en el servidor igual que useIdentidadGobMx
export function useEstilosInstancia() {
  const { data, refresh } = useFetch('/api/estilos-instancia', { key: 'estilos-instancia' });

  const perfil = computed(() => data.value?.perfil || 'sigic');
  const colorBase = computed(() => data.value?.colorBase || null);

  async function actualizarEstilos(cambios) {
    await $fetch('/api/estilos-instancia', { method: 'POST', body: cambios });
    await refresh();
  }

  return { perfil, colorBase, actualizarEstilos };
}
