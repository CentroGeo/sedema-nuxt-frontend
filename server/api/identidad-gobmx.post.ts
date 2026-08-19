import { getServerSession } from '#auth';

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event);
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'No autenticado' });
  }

  const body = await readBody(event);
  if (typeof body?.mostrarIdentidadGobMx !== 'boolean') {
    throw createError({
      statusCode: 400,
      statusMessage: 'mostrarIdentidadGobMx debe ser booleano',
    });
  }

  const mostrarIdentidadGobMx = await setMostrarIdentidadGobMx(body.mostrarIdentidadGobMx);
  return { mostrarIdentidadGobMx };
});
