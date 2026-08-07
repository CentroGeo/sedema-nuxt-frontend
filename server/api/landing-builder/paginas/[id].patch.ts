import formidable from 'formidable';
import { promises as fsp } from 'fs';
import type {
  LandingBuilderPaginaIdentidad,
  LandingBuilderBloque,
} from '../../../utils/landingBuilderConfig';
import {
  TIPOS_LOGO_PAGINA_PERMITIDOS,
  TAMANO_MAXIMO_LOGO_PAGINA,
  TAMANO_MAXIMO_VIDEO_BLOQUE,
  SLOTS_LOGO_PAGINA,
  CAMPO_IDENTIDAD_POR_SLOT,
  IDENTIDAD_PAGINA_VACIA,
  validarYObtenerMimetypeImagen,
  procesarImagenesDeBloques,
} from '../../../utils/landingBuilderConfig';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de la página' });
  }

  const contentType = getHeader(event, 'content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const form = formidable({ multiples: true, maxFileSize: TAMANO_MAXIMO_VIDEO_BLOQUE });
    const { fields, files } = await new Promise<{
      fields: formidable.Fields;
      files: formidable.Files;
    }>((resolve, reject) => {
      form.parse(event.node.req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const bloquesRaw = fields.bloques?.[0] ?? '[]';
    const bloques: LandingBuilderBloque[] = JSON.parse(bloquesRaw);
    await procesarImagenesDeBloques(files, bloques);

    const identidadRaw = fields.identidad?.[0] ?? '{}';
    const identidadEntrante: Partial<LandingBuilderPaginaIdentidad> = JSON.parse(identidadRaw);

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
        typeof identidadEntrante.logoCuartoUrl === 'string'
          ? identidadEntrante.logoCuartoUrl
          : null,
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
      const url = await saveLandingBuilderPaginaLogo(id, slot, data, mimetypeValido);
      identidad[CAMPO_IDENTIDAD_POR_SLOT[slot]] = url;
    }

    return actualizarLandingBuilderPagina(id, bloques, identidad);
  }

  const body = await readBody(event);

  if (Array.isArray(body?.bloques)) {
    if (!body.bloques.length) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Agrega al menos un bloque al lienzo antes de guardar la página',
      });
    }
    return actualizarLandingBuilderPagina(id, body.bloques);
  }

  const nombre = typeof body?.nombre === 'string' ? body.nombre.trim() : '';

  if (!nombre) {
    throw createError({ statusCode: 400, statusMessage: 'El nombre de la página es requerido' });
  }

  return renombrarLandingBuilderPagina(id, nombre);
});
