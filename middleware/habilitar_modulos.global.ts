// SPDX-FileCopyrightText: 2025 CentroGeo
// SPDX-FileContributor: César Benjamín <cesarbenjamindotnet@gmail.com>
// SPDX-License-Identifier: MIT

import type { ModuloGestionable } from '~/composables/useConfiguracionModulos';

const RUTAS_SUBMODULOS = [
  { modulo: 'catalogo', submodulo: 'catalogo-capas', rutas: ['/catalogo/explorar/capas'] },
  { modulo: 'catalogo', submodulo: 'catalogo-documentos', rutas: ['/catalogo/explorar/documentos'] },
  { modulo: 'catalogo', submodulo: 'catalogo-tablas', rutas: ['/catalogo/explorar/tablas'] },
  { modulo: 'catalogo', submodulo: 'catalogo-externos', rutas: ['/catalogo/explorar/catalogos-externos'] },
  { modulo: 'catalogo', submodulo: 'catalogo-cargar', rutas: ['/catalogo/cargar-archivos'] },
  { modulo: 'catalogo', submodulo: 'catalogo-mis-archivos', rutas: ['/catalogo/mis-archivos'] },
  { modulo: 'catalogo', submodulo: 'catalogo-revision', rutas: ['/catalogo/revision-solicitudes'] },
  { modulo: 'catalogo', submodulo: 'catalogo-servicios-remotos', rutas: ['/catalogo/servicios-remotos'] },
  { modulo: 'consulta', submodulo: 'consulta-capas', rutas: ['/consulta/capas'] },
  { modulo: 'consulta', submodulo: 'consulta-documentos', rutas: ['/consulta/documentos'] },
  { modulo: 'consulta', submodulo: 'consulta-tablas', rutas: ['/consulta/tablas'] },
  { modulo: 'geocontenidos', submodulo: 'geocontenidos-mapas', rutas: ['/geocontenidos/mapas', '/mapas'] },
  { modulo: 'geocontenidos', submodulo: 'geocontenidos-panoramas', rutas: ['/geocontenidos/panoramas', '/panoramas'] },
  { modulo: 'geocontenidos', submodulo: 'geocontenidos-geohistorias', rutas: ['/geocontenidos/geohistorias', '/geohistorias'] },
  { modulo: 'geocontenidos', submodulo: 'geocontenidos-tableros', rutas: ['/geocontenidos/tableros', '/tableros'] },
  { modulo: 'geocontenidos', submodulo: 'geocontenidos-importar', rutas: ['/geocontenidos/importar-datos'] },
  { modulo: 'levantamiento', submodulo: 'levantamiento-proyectos', rutas: ['/levantamiento/proyectos'] },
  { modulo: 'levantamiento', submodulo: 'levantamiento-aportes', rutas: ['/levantamiento/aportes'] },
  { modulo: 'levantamiento', submodulo: 'levantamiento-descargas', rutas: ['/levantamiento/descargas'] },
  { modulo: 'levantamiento', submodulo: 'levantamiento-revision-proyectos', rutas: ['/levantamiento/revision-proyectos'] },
  { modulo: 'levantamiento', submodulo: 'levantamiento-revision-aportes', rutas: ['/levantamiento/revision-aportes'] },
  { modulo: 'levantamiento', submodulo: 'levantamiento-revision-descargas', rutas: ['/levantamiento/revision-descargas'] },
  { modulo: 'ia', submodulo: 'ia-proyectos', rutas: ['/ia/proyectos', '/ia/proyecto'] },
  { modulo: 'ia', submodulo: 'ia-chats', rutas: ['/ia/chats', '/ia/chat'] },
] as const;

const RUTAS_RAIZ_MODULOS = {
  catalogo: '/catalogo',
  consulta: '/consulta',
  geocontenidos: '/geocontenidos',
  levantamiento: '/levantamiento',
  ia: '/ia',
} as const;

const RUTAS_ADICIONALES_MODULOS: Partial<Record<ModuloGestionable, string[]>> = {
  geocontenidos: ['/mapas', '/panoramas', '/geohistorias', '/tableros'],
};

const RUTAS_RAIZ_SECCIONES = [
  {
    ruta: '/catalogo/explorar',
    submodulos: [
      'catalogo-capas',
      'catalogo-documentos',
      'catalogo-tablas',
      'catalogo-externos',
    ],
  },
] as const;

function coincideRuta(ruta: string, prefijo: string) {
  return ruta === prefijo || ruta.startsWith(`${prefijo}/`);
}

function noDisponible() {
  return abortNavigation(
    createError({ statusCode: 404, statusMessage: 'El módulo solicitado no está disponible.' })
  );
}

export default defineNuxtRouteMiddleware(async (to) => {
  const {
    configuracion,
    submodulos,
    cargarConfiguracionModulos,
  } = useConfiguracionModulos();
  await cargarConfiguracionModulos();

  const reglasModulos = Object.entries(RUTAS_RAIZ_MODULOS) as Array<
    [ModuloGestionable, string]
  >;
  for (const [modulo, rutaRaiz] of reglasModulos) {
    const rutasModulo = [rutaRaiz, ...(RUTAS_ADICIONALES_MODULOS[modulo] || [])];
    if (
      rutasModulo.some((ruta) => coincideRuta(to.path, ruta)) &&
      !configuracion.value[modulo]
    ) {
      return noDisponible();
    }
  }

  // La raíz de cada módulo lleva al primer submódulo habilitado, respetando
  // el orden definido por Administración. Si no existe uno, el módulo queda
  // indisponible aunque su interruptor padre esté activo.
  for (const [modulo, rutaRaiz] of reglasModulos) {
    if (to.path === rutaRaiz || to.path === `${rutaRaiz}/`) {
      const primerSubmodulo = RUTAS_SUBMODULOS.find(
        (ruta) => ruta.modulo === modulo && submodulos.value[ruta.submodulo]
      );
      return primerSubmodulo ? navigateTo(primerSubmodulo.rutas[0]) : noDisponible();
    }
  }

  // La raíz de una sección tiene página propia (el hub de Explorar): se
  // muestra mientras quede al menos un submódulo habilitado y solo deja de
  // estar disponible cuando todos están apagados.
  for (const seccion of RUTAS_RAIZ_SECCIONES) {
    if (to.path === seccion.ruta || to.path === `${seccion.ruta}/`) {
      if (!seccion.submodulos.some((id) => submodulos.value[id])) {
        return noDisponible();
      }
      return;
    }
  }

  const rutasCoincidentes = RUTAS_SUBMODULOS.filter((configuracionRuta) =>
    configuracionRuta.rutas.some((ruta) => coincideRuta(to.path, ruta))
  ).sort(
    (a, b) =>
    Math.max(...b.rutas.map((ruta) => ruta.length)) - Math.max(...a.rutas.map((ruta) => ruta.length))
  );

  const rutaCoincidente = rutasCoincidentes[0];
  if (rutaCoincidente && !submodulos.value[rutaCoincidente.submodulo]) {
    return noDisponible();
  }
});
