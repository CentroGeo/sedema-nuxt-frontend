// Calcula si un color de fondo (hex) necesita texto claro u oscuro encima,
// usando la fórmula de luminancia relativa de WCAG. Se usa para que el
// header y el footer del constructor sigan siendo legibles sin importar qué
// color elija la persona usuaria.
export function calcularColorTextoContraste(hex) {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return '#000000';

  const canal = (valor) => {
    const c = valor / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  const r = canal(parseInt(hex.slice(1, 3), 16));
  const g = canal(parseInt(hex.slice(3, 5), 16));
  const b = canal(parseInt(hex.slice(5, 7), 16));

  const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminancia > 0.5 ? '#000000' : '#FFFFFF';
}

// Tinte claro (mezcla con blanco) de un color: se usa para estados hover/
// focus del menú, que necesitan seguir siendo del mismo color elegido pero
// lo bastante claros para que el texto oscuro encima sea legible.
export function calcularColorClaro(hex, mezclaBlanco = 0.82) {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return '#FFFFFF';

  const mezclar = (valor) => Math.round(valor + (255 - valor) * mezclaBlanco);
  const aHex = (valor) => valor.toString(16).padStart(2, '0').toUpperCase();

  const r = mezclar(parseInt(hex.slice(1, 3), 16));
  const g = mezclar(parseInt(hex.slice(3, 5), 16));
  const b = mezclar(parseInt(hex.slice(5, 7), 16));

  return `#${aHex(r)}${aHex(g)}${aHex(b)}`;
}

// Halo de texto (text-shadow) del color opuesto al del texto: garantiza
// contraste sin importar qué tan clara/oscura o "ruidosa" sea la imagen de
// fondo debajo (a diferencia de un degradado fijo, que solo ayuda con
// fondos relativamente uniformes). Se usa en la Portada, cuyo fondo es una
// imagen arbitraria que no se puede oscurecer de forma confiable de antemano.
export function calcularSombraTexto(colorTexto) {
  const opuesto = calcularColorTextoContraste(colorTexto || '#FFFFFF');
  const rgb = opuesto === '#000000' ? '0, 0, 0' : '255, 255, 255';
  return `0 1px 3px rgba(${rgb}, 0.9), 0 2px 16px rgba(${rgb}, 0.75)`;
}
