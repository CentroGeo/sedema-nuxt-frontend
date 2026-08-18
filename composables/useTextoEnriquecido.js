// Saneador de HTML minimalista para los bloques de texto del Constructor de
// Páginas: el contenido siempre viene de document.execCommand (negritas,
// listas, alineación, tamaño) sobre un contenteditable propio, así que basta
// con una lista blanca de etiquetas y, para las dos que lo necesitan
// (alineación vía `style="text-align"` en div/p, tamaño vía el atributo
// legado `size` de `<font>`), una validación estricta del único valor
// permitido. No usa DOMParser/document a propósito para funcionar igual en
// SSR (renderizado público) y en el navegador.
const ETIQUETAS_PERMITIDAS = new Set([
  'b',
  'strong',
  'i',
  'em',
  'ul',
  'li',
  'br',
  'div',
  'p',
  'span',
  'font',
]);

const REGEX_ALINEACION = /^(left|right|center|justify)$/;
const REGEX_TAMANO_LEGADO = /^[1-7]$/;

function extraerAtributo(atributos, nombre) {
  const regexDoble = new RegExp(`${nombre}\\s*=\\s*"([^"]*)"`, 'i');
  const regexSimple = new RegExp(`${nombre}\\s*=\\s*'([^']*)'`, 'i');
  const coincidencia = regexDoble.exec(atributos) || regexSimple.exec(atributos);
  return coincidencia ? coincidencia[1].trim() : null;
}

export function useTextoEnriquecido() {
  function sanitizarHtmlEnriquecido(html) {
    if (!html) return '';

    const sinPeligrosos = String(html)
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '');

    return sinPeligrosos.replace(
      /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g,
      (coincidencia, cierre, etiquetaCruda, atributos) => {
        const nombre = etiquetaCruda.toLowerCase();
        if (!ETIQUETAS_PERMITIDAS.has(nombre)) return '';
        if (cierre) return `</${nombre}>`;
        if (nombre === 'br') return '<br>';

        if (nombre === 'font') {
          const tamano = extraerAtributo(atributos, 'size');
          return tamano && REGEX_TAMANO_LEGADO.test(tamano) ? `<font size="${tamano}">` : '<font>';
        }

        if (nombre === 'div' || nombre === 'p') {
          const estilo = extraerAtributo(atributos, 'style');
          const alineacion = estilo && /text-align\s*:\s*([a-z]+)/i.exec(estilo);
          const valor = alineacion?.[1]?.toLowerCase();
          if (valor && REGEX_ALINEACION.test(valor)) {
            return `<${nombre} style="text-align: ${valor}">`;
          }
        }

        return `<${nombre}>`;
      }
    );
  }

  function htmlEstaVacio(html) {
    return (
      !html ||
      !String(html)
        .replace(/<[^>]*>/g, '')
        .trim()
    );
  }

  return { sanitizarHtmlEnriquecido, htmlEstaVacio };
}
