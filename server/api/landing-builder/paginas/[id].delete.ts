export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el identificador de la página' });
  }

  return eliminarLandingBuilderPagina(id);
});
