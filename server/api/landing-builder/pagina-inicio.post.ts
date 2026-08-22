import { getServerSession } from '#auth';

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event);
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'No autenticado' });
  }

  const body = await readBody(event);
  const paginaInicioId = typeof body?.paginaInicioId === 'string' ? body.paginaInicioId : null;

  return setLandingBuilderPaginaInicio(paginaInicioId);
});
