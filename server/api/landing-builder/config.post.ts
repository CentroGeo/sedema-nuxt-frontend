import { getServerSession } from '#auth';
import formidable from 'formidable';
import { promises as fsp } from 'fs';
import type { LandingBuilderConfig, LandingBuilderTarjeta } from '../../utils/landingBuilderConfig';
import {
  LIMITE_TARJETAS,
  validarYObtenerMimetypeImagen,
  procesarImagenesDeBloques,
  TAMANO_MAXIMO_VIDEO_BLOQUE,
} from '../../utils/landingBuilderConfig';

const TIPOS_LOGO_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const TAMANO_MAXIMO_LOGO = 2 * 1024 * 1024; // 2MB
const CAMPOS_REQUERIDOS = [
  'titulo',
  'subtitulo',
  'tituloSeccion',
  'descripcion',
  'seccionTexto',
] as const;

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event);
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'No autenticado' });
  }

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

  const campos: Record<string, any> = {};
  for (const campo of CAMPOS_REQUERIDOS) {
    const valor = fields[campo]?.[0]?.trim();
    if (!valor) {
      throw createError({ statusCode: 400, statusMessage: `El campo "${campo}" es requerido` });
    }
    campos[campo] = valor;
  }

  if (fields.nombrePlataforma?.[0] !== undefined) {
    campos.nombrePlataforma = fields.nombrePlataforma[0].trim();
  }

  if (fields.logoUrl?.[0] !== undefined) {
    campos.logoUrl = fields.logoUrl[0].trim();
  }

  if (fields.logoSecundarioUrl?.[0] !== undefined) {
    campos.logoSecundarioUrl = fields.logoSecundarioUrl[0].trim();
  }

  if (fields.logoTerceroUrl?.[0] !== undefined) {
    campos.logoTerceroUrl = fields.logoTerceroUrl[0].trim();
  }

  if (fields.logoCuartoUrl?.[0] !== undefined) {
    campos.logoCuartoUrl = fields.logoCuartoUrl[0].trim();
  }

  if (fields.logoRedirectUrl?.[0] !== undefined) {
    campos.logoRedirectUrl = fields.logoRedirectUrl[0].trim();
  }

  if (fields.logoSecundarioRedirectUrl?.[0] !== undefined) {
    campos.logoSecundarioRedirectUrl = fields.logoSecundarioRedirectUrl[0].trim();
  }

  if (fields.logoTerceroRedirectUrl?.[0] !== undefined) {
    campos.logoTerceroRedirectUrl = fields.logoTerceroRedirectUrl[0].trim();
  }

  if (fields.logoCuartoRedirectUrl?.[0] !== undefined) {
    campos.logoCuartoRedirectUrl = fields.logoCuartoRedirectUrl[0].trim();
  }

  const seccionesRaw = fields.secciones?.[0];
  const secciones = seccionesRaw ? JSON.parse(seccionesRaw) : [];

  for (const key of Object.keys(files)) {
    if (key.startsWith('tarjeta_imagen_')) {
      const parts = key.replace('tarjeta_imagen_', '').split('_');
      const sectionId = parts[0];
      const cardId = parts[1];
      const archivoCard = files[key]?.[0];
      if (archivoCard) {
        if (archivoCard.mimetype && TIPOS_LOGO_PERMITIDOS.includes(archivoCard.mimetype)) {
          const data = await fsp.readFile(archivoCard.filepath);
          const url = await saveLandingBuilderCardImage(
            sectionId,
            cardId,
            data,
            archivoCard.mimetype
          );

          const seccion = secciones.find((s: any) => s.id === sectionId);
          if (seccion && seccion.datos && seccion.datos.tarjetas) {
            const card = seccion.datos.tarjetas.find((c: any) => c.id === cardId);
            if (card) {
              card.imagenUrl = url;
            }
          }
        }
      }
    }
  }

  campos.secciones = secciones;

  const bloquesRaw = fields.bloques?.[0];
  let bloques: any[] = [];
  if (bloquesRaw) {
    try {
      bloques = JSON.parse(bloquesRaw);
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'El listado de bloques es inválido' });
    }
    if (!Array.isArray(bloques)) {
      throw createError({ statusCode: 400, statusMessage: 'El listado de bloques es inválido' });
    }
  }

  await procesarImagenesDeBloques(files, bloques);

  campos.bloques = bloques;

  let logo: { data: Buffer; mimetype: string } | undefined;
  const archivoLogo = files.logo?.[0];
  if (archivoLogo) {
    const mimetypeValido = validarYObtenerMimetypeImagen(archivoLogo, TIPOS_LOGO_PERMITIDOS);
    if (!mimetypeValido) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El logo debe ser una imagen PNG, JPEG, WEBP o SVG',
      });
    }
    if (archivoLogo.size > TAMANO_MAXIMO_LOGO) {
      throw createError({ statusCode: 400, statusMessage: 'El logo no debe superar 2MB' });
    }
    logo = {
      data: await fsp.readFile(archivoLogo.filepath),
      mimetype: mimetypeValido,
    };
  }

  let logoSecundario: { data: Buffer; mimetype: string } | undefined;
  const archivoLogoSecundario = files.logoSecundario?.[0];
  if (archivoLogoSecundario) {
    const mimetypeValido = validarYObtenerMimetypeImagen(
      archivoLogoSecundario,
      TIPOS_LOGO_PERMITIDOS
    );
    if (!mimetypeValido) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El logo secundario debe ser una imagen PNG, JPEG, WEBP o SVG',
      });
    }
    if (archivoLogoSecundario.size > TAMANO_MAXIMO_LOGO) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El logo secundario no debe superar 2MB',
      });
    }
    logoSecundario = {
      data: await fsp.readFile(archivoLogoSecundario.filepath),
      mimetype: mimetypeValido,
    };
  }

  let logoTercero: { data: Buffer; mimetype: string } | undefined;
  const archivoLogoTercero = files.logoTercero?.[0];
  if (archivoLogoTercero) {
    const mimetypeValido = validarYObtenerMimetypeImagen(archivoLogoTercero, TIPOS_LOGO_PERMITIDOS);
    if (!mimetypeValido) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El logo tercero debe ser una imagen PNG, JPEG, WEBP o SVG',
      });
    }
    if (archivoLogoTercero.size > TAMANO_MAXIMO_LOGO) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El logo tercero no debe superar 2MB',
      });
    }
    logoTercero = {
      data: await fsp.readFile(archivoLogoTercero.filepath),
      mimetype: mimetypeValido,
    };
  }

  let logoCuarto: { data: Buffer; mimetype: string } | undefined;
  const archivoLogoCuarto = files.logoCuarto?.[0];
  if (archivoLogoCuarto) {
    const mimetypeValido = validarYObtenerMimetypeImagen(archivoLogoCuarto, TIPOS_LOGO_PERMITIDOS);
    if (!mimetypeValido) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El logo cuarto debe ser una imagen PNG, JPEG, WEBP o SVG',
      });
    }
    if (archivoLogoCuarto.size > TAMANO_MAXIMO_LOGO) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El logo cuarto no debe superar 2MB',
      });
    }
    logoCuarto = {
      data: await fsp.readFile(archivoLogoCuarto.filepath),
      mimetype: mimetypeValido,
    };
  }

  let tarjetasCrudas: unknown;
  try {
    tarjetasCrudas = JSON.parse(fields.tarjetas?.[0] ?? '[]');
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'El listado de tarjetas es inválido' });
  }

  if (!Array.isArray(tarjetasCrudas)) {
    throw createError({ statusCode: 400, statusMessage: 'El listado de tarjetas es inválido' });
  }

  if (tarjetasCrudas.length > LIMITE_TARJETAS) {
    throw createError({
      statusCode: 400,
      statusMessage: `No se permiten más de ${LIMITE_TARJETAS} tarjetas`,
    });
  }

  const tarjetas: Array<Omit<LandingBuilderTarjeta, 'imagenUrl'> & { imagenUrl?: string | null }> =
    tarjetasCrudas.map((valor) => {
      if (!valor || typeof valor !== 'object') {
        throw createError({ statusCode: 400, statusMessage: 'Cada tarjeta requiere un id válido' });
      }

      const tarjeta = valor as Record<string, unknown>;
      if (typeof tarjeta.id !== 'string' || !tarjeta.id) {
        throw createError({ statusCode: 400, statusMessage: 'Cada tarjeta requiere un id válido' });
      }

      const imagenUrl = tarjeta.imagenUrl;
      return {
        id: tarjeta.id,
        titulo: typeof tarjeta.titulo === 'string' ? tarjeta.titulo.trim() : '',
        descripcion: typeof tarjeta.descripcion === 'string' ? tarjeta.descripcion.trim() : '',
        textoBoton: typeof tarjeta.textoBoton === 'string' ? tarjeta.textoBoton.trim() : '',
        enlaceBoton: typeof tarjeta.enlaceBoton === 'string' ? tarjeta.enlaceBoton.trim() : '',
        imagenUrl:
          typeof imagenUrl === 'string' && imagenUrl && !imagenUrl.startsWith('blob:')
            ? imagenUrl
            : null,
      };
    });

  const imagenesTarjetas: Record<string, { data: Buffer; mimetype: string }> = {};
  for (const tarjeta of tarjetas) {
    const archivoImagen = files[`tarjetaImagen_${tarjeta.id}`]?.[0];
    if (!archivoImagen) continue;

    const mimetypeValido = validarYObtenerMimetypeImagen(archivoImagen, TIPOS_LOGO_PERMITIDOS);
    if (!mimetypeValido) {
      throw createError({
        statusCode: 400,
        statusMessage: 'La imagen de la tarjeta debe ser PNG, JPEG, WEBP o SVG',
      });
    }
    if (archivoImagen.size > TAMANO_MAXIMO_LOGO) {
      throw createError({
        statusCode: 400,
        statusMessage: 'La imagen de la tarjeta no debe superar 2MB',
      });
    }

    imagenesTarjetas[tarjeta.id] = {
      data: await fsp.readFile(archivoImagen.filepath),
      mimetype: mimetypeValido,
    };
  }

  return saveLandingBuilderConfig(
    {
      ...campos,
      tarjetas,
    } as unknown as Omit<
      LandingBuilderConfig,
      | 'logoUrl'
      | 'logoSecundarioUrl'
      | 'logoTerceroUrl'
      | 'logoCuartoUrl'
      | 'tarjetas'
      | 'actualizadoEn'
    > & {
      logoUrl?: string;
      logoSecundarioUrl?: string;
      logoTerceroUrl?: string;
      logoCuartoUrl?: string;
      tarjetas: Array<Omit<LandingBuilderTarjeta, 'imagenUrl'> & { imagenUrl?: string | null }>;
    },
    logo,
    logoSecundario,
    logoTercero,
    logoCuarto,
    imagenesTarjetas
  );
});
