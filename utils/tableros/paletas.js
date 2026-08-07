/**
 * Paletas de color de los indicadores de tableros.
 *
 * El backend (`sigic_dashboard/utils/indicator_utils.py::get_color_palette`) resuelve
 * la rampa a partir del nombre guardado en `Indicator.colors`. La inversión se codifica
 * como sufijo `_r` sobre el nombre base (`azules_3` → `azules_3_r`).
 *
 * Ojo: cambiar `colors` NO repinta nada por sí solo. Los hex ya materializados viven en
 * `plot_config.ranges[].color` y `map_values[fid].color`, y solo se regeneran con
 * `POST /indicators/{id}/recompute/` (ver `useTableroApi().recalcularIndicador`).
 */

export const SUFIJO_INVERTIDA = '_r';

export const PALETA_POR_DEFECTO = 'azules_3';

export const PALETAS = [
  {
    group: 'Azules',
    options: [
      { value: 'azules', label: 'Azules' },
      { value: 'azules_2', label: 'Azules 2' },
      { value: 'azules_3', label: 'Azules 3' },
      { value: 'azules_4', label: 'Azules 4' },
      { value: 'azules_5', label: 'Azules 5' },
    ],
  },
  {
    group: 'Verdes',
    options: [
      { value: 'verdes', label: 'Verdes' },
      { value: 'verdes_2', label: 'Verdes 2' },
      { value: 'verdes_3', label: 'Verdes 3' },
      { value: 'verdes_4', label: 'Verdes 4' },
      { value: 'verdes_5', label: 'Verdes 5' },
      { value: 'verdes_6', label: 'Verdes 6' },
    ],
  },
  {
    group: 'Cafés / naranjas',
    options: [
      { value: 'cafes', label: 'Cafés' },
      { value: 'cafes_2', label: 'Cafés 2' },
      { value: 'cafes_3', label: 'Cafés 3' },
      { value: 'naranjas', label: 'Naranjas' },
    ],
  },
  {
    group: 'Morados / rosas',
    options: [
      { value: 'morados', label: 'Morados' },
      { value: 'morados_2', label: 'Morados 2' },
      { value: 'rosas', label: 'Rosas' },
    ],
  },
  {
    group: 'Divergentes',
    options: [
      { value: 'cafes_verdes', label: 'Café ↔ Verde' },
      { value: 'naranja_azul', label: 'Naranja ↔ Azul' },
      { value: 'rosa_verde', label: 'Rosa ↔ Verde' },
    ],
  },
  {
    group: 'Semáforo',
    options: [
      { value: 'semaforo', label: 'Semáforo' },
      { value: 'semaforo_2', label: 'Semáforo 2' },
      { value: 'semaforo_3', label: 'Semáforo 3 tonos' },
      { value: 'semaforo_4', label: 'Semáforo 4 (invertido)' },
      { value: 'semaforo_5', label: 'Semáforo 5 (intenso, invertido)' },
      { value: 'semaforo_6', label: 'Semáforo 6 (3 colores)' },
      { value: 'semaforo_7', label: 'Semáforo 7 (5 pasos)' },
      { value: 'semaforo_8', label: 'Semáforo 8 (5 pasos)' },
    ],
  },
  {
    group: 'Otras',
    options: [
      { value: 'grises', label: 'Grises' },
      { value: 'varios', label: 'Multicolor' },
      { value: 'varios_2', label: 'Multicolor 2' },
      { value: 'varios_3', label: 'Multicolor 3' },
    ],
  },
];

/** Nombres base válidos, para descartar valores desconocidos al decodificar. */
const BASES_VALIDAS = new Set(PALETAS.flatMap((g) => g.options.map((o) => o.value)));

/**
 * Arma el valor que espera el backend a partir de la paleta base y el toggle de invertir.
 * @param {string} base nombre de la paleta sin sufijo, p. ej. 'azules_3'
 * @param {boolean} invertida
 * @returns {string} p. ej. 'azules_3_r'
 */
export function codificarPaleta(base, invertida) {
  const nombre = BASES_VALIDAS.has(base) ? base : PALETA_POR_DEFECTO;
  return invertida ? `${nombre}${SUFIJO_INVERTIDA}` : nombre;
}

/**
 * Separa el valor guardado en paleta base + estado del toggle de invertir.
 *
 * Solo trata el sufijo `_r` como "invertida" si lo que queda es una paleta conocida;
 * así un nombre base que legítimamente terminara en `_r` no se mutila.
 *
 * @param {string} raw valor de `Indicator.colors`
 * @returns {{ base: string, invertida: boolean }}
 */
export function decodificarPaleta(raw) {
  const valor = typeof raw === 'string' && raw ? raw : PALETA_POR_DEFECTO;

  if (valor.endsWith(SUFIJO_INVERTIDA)) {
    const base = valor.slice(0, -SUFIJO_INVERTIDA.length);
    if (BASES_VALIDAS.has(base)) return { base, invertida: true };
  }

  return {
    base: BASES_VALIDAS.has(valor) ? valor : PALETA_POR_DEFECTO,
    invertida: false,
  };
}
