export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'id');
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de la página' });
  }

  const pagina = await getLandingBuilderPaginaPorSlug(slug);
  if (!pagina) {
    throw createError({ statusCode: 404, statusMessage: 'Página no encontrada' });
  }

  return pagina;
});
