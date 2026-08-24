import { getServerSession } from '#auth';
import { colorBaseValido } from '#shared/utils/generarPaletaSisdai';

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event);
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'No autenticado' });
  }

  const body = await readBody(event);
  const cambios: Record<string, unknown> = {};

  if (body?.perfil !== undefined) {
    if (!validarPerfil(body.perfil)) {
      throw createError({
        statusCode: 400,
        statusMessage: `perfil debe ser uno de: ${PERFILES_SISDAI_DISPONIBLES.join(', ')}`,
      });
    }
    cambios.perfil = body.perfil;
  }

  if (body?.colorBase !== undefined) {
    if (body.colorBase !== null && !colorBaseValido(body.colorBase)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'colorBase debe ser un color hexadecimal, ej. #9D2148',
      });
    }
    cambios.colorBase = body.colorBase;
  }

  return setEstilosInstancia(cambios);
});
