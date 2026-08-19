/**
 * Ajuste global del sitio: controla si la barra y el pie de página de
 * identidad de Gobierno de México se muestran en todo el sitio (todos los
 * módulos, no solo el constructor de páginas). El estado vive en el
 * servidor, así que afecta a cualquier persona que visite el sitio.
 *
 * Usa la misma clave (`identidad-gobmx`) en todos los lugares donde se
 * invoca este composable para que compartan el mismo dato reactivo y se
 * actualicen juntos al alternar el valor.
 */
export function useIdentidadGobMx() {
  const { data, refresh } = useFetch('/api/identidad-gobmx', { key: 'identidad-gobmx' });

  const mostrarIdentidadGobMx = computed(() => data.value?.mostrarIdentidadGobMx !== false);

  async function alternarIdentidadGobMx() {
    const nuevoValor = !mostrarIdentidadGobMx.value;
    await $fetch('/api/identidad-gobmx', {
      method: 'POST',
      body: { mostrarIdentidadGobMx: nuevoValor },
    });
    await refresh();
  }

  return { mostrarIdentidadGobMx, alternarIdentidadGobMx };
}
