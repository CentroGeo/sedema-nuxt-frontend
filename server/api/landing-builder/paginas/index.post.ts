import formidable from 'formidable';
import { promises as fsp } from 'fs';
import {
  crearLandingBuilderPagina,
  saveLandingBuilderPaginaLogo,
  SLOTS_LOGO_PAGINA,
  TIPOS_LOGO_PAGINA_PERMITIDOS,
  TAMANO_MAXIMO_LOGO_PAGINA,
  CAMPO_IDENTIDAD_POR_SLOT,
  IDENTIDAD_PAGINA_VACIA,
  validarYObtenerMimetypeImagen,
} from '../../../utils/landingBuilderConfig';
import type { LandingBuilderPaginaIdentidad } from '../../../utils/landingBuilderConfig';

export default defineEventHandler(async (event) => {
  const form = formidable({ multiples: true });
  const { fields, files } = await new Promise<{
    fields: formidable.Fields;
    files: formidable.Files;
  }>((resolve, reject) => {
    form.parse(event.node.req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

  let bloques: any[];
  try {
    bloques = JSON.parse(fields.bloques?.[0] ?? 'null');
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'El listado de bloques es inválido' });
  }

  if (!Array.isArray(bloques) || !bloques.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Agrega al menos un bloque al lienzo antes de crear una página',
    });
  }

  let identidadEntrante: Record<string, unknown> = {};
  try {
    identidadEntrante = fields.identidad?.[0] ? JSON.parse(fields.identidad[0]) : {};
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'La identidad de la página es inválida' });
  }

  const paginaId = `pagina-${Date.now()}`;

  const identidad: LandingBuilderPaginaIdentidad = {
    ...IDENTIDAD_PAGINA_VACIA,
    nombrePlataforma:
      typeof identidadEntrante.nombrePlataforma === 'string'
        ? identidadEntrante.nombrePlataforma.trim()
        : '',
    logoUrl: typeof identidadEntrante.logoUrl === 'string' ? identidadEntrante.logoUrl : null,
    logoSecundarioUrl:
      typeof identidadEntrante.logoSecundarioUrl === 'string'
        ? identidadEntrante.logoSecundarioUrl
        : null,
    logoTerceroUrl:
      typeof identidadEntrante.logoTerceroUrl === 'string'
        ? identidadEntrante.logoTerceroUrl
        : null,
    logoCuartoUrl:
      typeof identidadEntrante.logoCuartoUrl === 'string' ? identidadEntrante.logoCuartoUrl : null,
    logoRedirectUrl:
      typeof identidadEntrante.logoRedirectUrl === 'string'
        ? identidadEntrante.logoRedirectUrl
        : null,
    logoSecundarioRedirectUrl:
      typeof identidadEntrante.logoSecundarioRedirectUrl === 'string'
        ? identidadEntrante.logoSecundarioRedirectUrl
        : null,
    logoTerceroRedirectUrl:
      typeof identidadEntrante.logoTerceroRedirectUrl === 'string'
        ? identidadEntrante.logoTerceroRedirectUrl
        : null,
    logoCuartoRedirectUrl:
      typeof identidadEntrante.logoCuartoRedirectUrl === 'string'
        ? identidadEntrante.logoCuartoRedirectUrl
        : null,
    mostrarBarraGobMx:
      typeof identidadEntrante.mostrarBarraGobMx === 'boolean'
        ? identidadEntrante.mostrarBarraGobMx
        : true,
  };

  for (const slot of SLOTS_LOGO_PAGINA) {
    const archivo = files[slot]?.[0];
    if (!archivo) continue;

    const mimetypeValido = validarYObtenerMimetypeImagen(archivo, TIPOS_LOGO_PAGINA_PERMITIDOS);
    if (!mimetypeValido) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El logo debe ser una imagen PNG, JPEG, WEBP o SVG',
      });
    }
    if (archivo.size > TAMANO_MAXIMO_LOGO_PAGINA) {
      throw createError({ statusCode: 400, statusMessage: 'El logo no debe superar 2MB' });
    }

    const data = await fsp.readFile(archivo.filepath);
    const url = await saveLandingBuilderPaginaLogo(paginaId, slot, data, mimetypeValido);
    identidad[CAMPO_IDENTIDAD_POR_SLOT[slot]] = url;
  }

  return crearLandingBuilderPagina(bloques, identidad, paginaId);
});
