/**
 * Mapas base disponibles para un Panorama (campo `config` del modelo).
 * Mismas fuentes que usaba geoweb (idegeo/static/panoramas/src/utils/mapProviders.ts)
 * para no perder compatibilidad con panoramas ya configurados.
 */
export const basemapsPanorama = [
  {
    id: 'gray',
    label: 'Gris',
    fuente:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  },
  {
    id: 'osm',
    label: 'Open Street Map',
    fuente: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  {
    id: 'imagery',
    label: 'Satélite',
    fuente:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
  {
    id: 'topo',
    label: 'Topográfico',
    fuente:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
  },
  {
    id: 'streets',
    label: 'Carreteras',
    fuente:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  },
  {
    id: 'relief',
    label: 'Relieve',
    fuente:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
  },
  {
    id: 'oceans',
    label: 'Océanos',
    fuente:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
  },
  {
    id: 'natgeo',
    label: 'National Geographic',
    fuente:
      'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
  },
];

export function fuenteBasemap(id) {
  return basemapsPanorama.find((b) => b.id === id)?.fuente || basemapsPanorama[0].fuente;
}

/**
 * Set curado de iconos (clases `pictograma-*` de sisdai-css) para tematicas de Panorama.
 * geoweb usaba un buscador de iconos de MUI; aqui usamos un set fijo del design system de sigic.
 */
export const iconosTematicaPanorama = [
  'mapa-generador',
  'reporte',
  'proyectos',
  'archivo-subir',
  'ayuda',
  'mexico',
  'aprobado',
  'editar',
];
