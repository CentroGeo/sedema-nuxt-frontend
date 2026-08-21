// genera los 16 tokens de color de un perfil sisdai a partir de 1 color base

type CanalRgb = [number, number, number];

const REGEX_HEX = /^#[0-9A-Fa-f]{6}$/;

// Ratio positivo = mezcla hacia blanco; ratio negativo = mezcla hacia negro.
const RATIOS_PRIMARIO: Record<string, number> = {
  4: -0.2,
  3: 0,
  2: 0.45,
  1: 0.55,
};

const RATIOS_SECUNDARIO: Record<string, number> = {
  12: -0.62,
  11: -0.56,
  10: -0.5,
  9: -0.36,
  8: -0.24,
  7: 0.12,
  6: 0.38,
  5: 0.64,
  4: 0.82,
  3: 0.88,
  2: 0.95,
  1: 0.97,
};

function hexARgb(hex: string): CanalRgb {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbAHex([r, g, b]: CanalRgb): string {
  const aHex = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${aHex(r)}${aHex(g)}${aHex(b)}`.toUpperCase();
}

function tono([r, g, b]: CanalRgb, ratio: number): CanalRgb {
  const hacia = ratio >= 0 ? 255 : 0;
  const magnitud = Math.abs(ratio);
  return [r + (hacia - r) * magnitud, g + (hacia - g) * magnitud, b + (hacia - b) * magnitud];
}

export function colorBaseValido(valor: unknown): valor is string {
  return typeof valor === 'string' && REGEX_HEX.test(valor);
}

/** Devuelve { '--color-primario-4': '#...', ..., '--color-secundario-11-rgb': 'r, g, b' } */
export function generarPaletaPersonalizada(colorBase: string): Record<string, string> {
  if (!colorBaseValido(colorBase)) return {};
  const base = hexARgb(colorBase);
  const variables: Record<string, string> = {};

  for (const [nivel, ratio] of Object.entries(RATIOS_PRIMARIO)) {
    variables[`--color-primario-${nivel}`] = rgbAHex(tono(base, ratio));
  }
  for (const [nivel, ratio] of Object.entries(RATIOS_SECUNDARIO)) {
    variables[`--color-secundario-${nivel}`] = rgbAHex(tono(base, ratio));
  }

  const [r11, g11, b11] = tono(base, RATIOS_SECUNDARIO[11]).map((v) => Math.round(v));
  variables['--color-secundario-11-rgb'] = `${r11}, ${g11}, ${b11}`;

  return variables;
}

/** CSS listo para inyectar en un <style>: body[data-perfil='personalizado'] { ... } */
export function generarCssPerfilPersonalizado(colorBase: string | null | undefined): string {
  if (!colorBaseValido(colorBase)) return '';
  const variables = generarPaletaPersonalizada(colorBase);
  const declaraciones = Object.entries(variables)
    .map(([nombre, valor]) => `  ${nombre}: ${valor};`)
    .join('\n');
  return `body[data-perfil='personalizado'] {\n${declaraciones}\n}`;
}
