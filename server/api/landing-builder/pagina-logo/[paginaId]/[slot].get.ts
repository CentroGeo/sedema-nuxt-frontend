export default defineEventHandler(async (event) => {
  const paginaId = getRouterParam(event, 'paginaId');
  const slot = getRouterParam(event, 'slot');
  if (!paginaId || !slot) {
    throw createError({ statusCode: 400, statusMessage: 'Faltan parámetros del logo' });
  }

  const logo = await getLandingBuilderPaginaLogo(paginaId, slot);
  if (!logo) {
    throw createError({ statusCode: 404, statusMessage: 'No hay logo configurado' });
  }
  setHeader(event, 'content-type', logo.mimetype);
  setHeader(event, 'cache-control', 'no-cache');
  return logo.data;
});
