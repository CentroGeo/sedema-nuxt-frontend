export const MODULOS_GESTIONABLES = [
  'catalogo',
  'consulta',
  'geocontenidos',
  'levantamiento',
  'ia',
] as const;

export const SUBMODULOS_GESTIONABLES = [
  'catalogo-capas',
  'catalogo-documentos',
  'catalogo-tablas',
  'catalogo-externos',
  'catalogo-cargar',
  'catalogo-mis-archivos',
  'catalogo-revision',
  'catalogo-servicios-remotos',
  'consulta-capas',
  'consulta-documentos',
  'consulta-tablas',
  'geocontenidos-mapas',
  'geocontenidos-panoramas',
  'geocontenidos-geohistorias',
  'geocontenidos-tableros',
  'geocontenidos-importar',
  'geocontenidos-micrositios',
  'levantamiento-proyectos',
  'levantamiento-aportes',
  'levantamiento-descargas',
  'levantamiento-revision-proyectos',
  'levantamiento-revision-aportes',
  'levantamiento-revision-descargas',
  'ia-proyectos',
  'ia-chats',
] as const;

export type ModuloGestionable = (typeof MODULOS_GESTIONABLES)[number];
export type SubmoduloGestionable = (typeof SUBMODULOS_GESTIONABLES)[number];
export type ConfiguracionModulos = Record<ModuloGestionable, boolean>;
export type ConfiguracionSubmodulos = Record<SubmoduloGestionable, boolean>;

function valoresPredeterminados(): ConfiguracionModulos {
  const config = useRuntimeConfig();

  // Si el endpoint aún no está disponible durante un despliegue gradual,
  // conservamos el comportamiento de las banderas de entorno existentes.
  return {
    catalogo: Boolean(config.public.enableCatalogoVista),
    consulta: Boolean(config.public.enableConsulta),
    geocontenidos: Boolean(config.public.enableGeocontenidos),
    levantamiento: Boolean(config.public.enableLevantamiento),
    ia: Boolean(config.public.enableIaa),
  };
}

function valoresPredeterminadosSubmodulos(): ConfiguracionSubmodulos {
  return SUBMODULOS_GESTIONABLES.reduce((resultado, submodulo) => {
    resultado[submodulo] = true;
    return resultado;
  }, {} as ConfiguracionSubmodulos);
}

function normalizarConfiguracion(valor: unknown): ConfiguracionModulos | null {
  if (!valor || typeof valor !== 'object') return null;

  const recibida = valor as Record<string, unknown>;
  if (
    !MODULOS_GESTIONABLES.every((modulo) => {
      const estado = recibida[modulo];
      return typeof estado === 'boolean' || estado === null;
    })
  ) {
    return null;
  }

  const predeterminados = valoresPredeterminados();
  return MODULOS_GESTIONABLES.reduce((resultado, modulo) => {
    const estado = recibida[modulo];
    resultado[modulo] = typeof estado === 'boolean' ? estado : predeterminados[modulo];
    return resultado;
  }, {} as ConfiguracionModulos);
}

function normalizarSubmodulos(valor: unknown): ConfiguracionSubmodulos | null {
  if (!valor || typeof valor !== 'object') return null;

  const recibida = valor as Record<string, unknown>;
  if (
    !SUBMODULOS_GESTIONABLES.every((submodulo) => {
      const estado = recibida[submodulo];
      return typeof estado === 'boolean' || estado === null;
    })
  ) {
    return null;
  }

  const predeterminados = valoresPredeterminadosSubmodulos();
  return SUBMODULOS_GESTIONABLES.reduce((resultado, submodulo) => {
    const estado = recibida[submodulo];
    resultado[submodulo] = typeof estado === 'boolean' ? estado : predeterminados[submodulo];
    return resultado;
  }, {} as ConfiguracionSubmodulos);
}

/**
 * Estado compartido de la disponibilidad de módulos. La fuente de verdad es
 * GeoNode: el GET es público y el PATCH se autoriza en el backend.
 */
export function useConfiguracionModulos() {
  const configuracion = useState<ConfiguracionModulos>(
    'configuracion-modulos',
    valoresPredeterminados
  );
  const cargada = useState<boolean>('configuracion-modulos-cargada', () => false);
  const submodulos = useState<ConfiguracionSubmodulos>(
    'configuracion-submodulos',
    valoresPredeterminadosSubmodulos
  );

  const { gnoxyFetch } = useGnoxyUrl();
  const config = useRuntimeConfig();
  const endpoint = `${config.public.geonodeApi}/configuracion-modulos/`;

  async function cargarConfiguracionModulos(forzar = false) {
    if (cargada.value && !forzar) return configuracion.value;

    try {
      const respuesta = await gnoxyFetch(endpoint);
      if (!respuesta.ok) {
        throw new Error(`No fue posible obtener la configuración de módulos (${respuesta.status}).`);
      }

      const recibida: unknown = await respuesta.json();
      const normalizada = normalizarConfiguracion(recibida);
      const submodulosNormalizados = normalizarSubmodulos(
        (recibida as Record<string, unknown>)?.submodulos
      );
      if (!normalizada || !submodulosNormalizados) {
        throw new Error('El backend devolvió una configuración de módulos inválida.');
      }

      configuracion.value = normalizada;
      submodulos.value = submodulosNormalizados;
      cargada.value = true;
    } catch (error) {
      // El fallback evita que un despliegue en el que GeoNode todavía no tenga
      // aplicada la migración exponga módulos distintos a los actuales. No se
      // marca como cargada para reintentar en la siguiente navegación.
      console.error('No fue posible cargar la configuración global de módulos:', error);
    }

    return configuracion.value;
  }

  async function actualizarModulo(modulo: ModuloGestionable, habilitado: boolean) {
    const respuesta = await gnoxyFetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [modulo]: habilitado }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.json().catch(() => null);
      throw new Error(detalle?.detail || 'No fue posible actualizar la configuración de módulos.');
    }

    const recibida: unknown = await respuesta.json();
    const normalizada = normalizarConfiguracion(recibida);
    const submodulosNormalizados = normalizarSubmodulos(
      (recibida as Record<string, unknown>)?.submodulos
    );
    if (!normalizada || !submodulosNormalizados) {
      throw new Error('El backend devolvió una configuración de módulos inválida.');
    }

    configuracion.value = normalizada;
    submodulos.value = submodulosNormalizados;
    cargada.value = true;
  }

  async function actualizarSubmodulo(submodulo: SubmoduloGestionable, habilitado: boolean) {
    const respuesta = await gnoxyFetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submodulos: { [submodulo]: habilitado } }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.json().catch(() => null);
      throw new Error(detalle?.detail || 'No fue posible actualizar la configuración de submódulos.');
    }

    const recibida: unknown = await respuesta.json();
    const normalizada = normalizarConfiguracion(recibida);
    const submodulosNormalizados = normalizarSubmodulos(
      (recibida as Record<string, unknown>)?.submodulos
    );
    if (!normalizada || !submodulosNormalizados) {
      throw new Error('El backend devolvió una configuración de módulos inválida.');
    }

    configuracion.value = normalizada;
    submodulos.value = submodulosNormalizados;
    cargada.value = true;
  }

  function estaHabilitado(modulo: ModuloGestionable) {
    return computed(() => configuracion.value[modulo]);
  }

  function estaSubmoduloHabilitado(submodulo: string) {
    return computed(() => submodulos.value[submodulo as SubmoduloGestionable] ?? false);
  }

  return {
    configuracion,
    submodulos,
    cargada,
    cargarConfiguracionModulos,
    actualizarModulo,
    actualizarSubmodulo,
    estaHabilitado,
    estaSubmoduloHabilitado,
  };
}
