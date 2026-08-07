export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const paginaInicioId = typeof body?.paginaInicioId === 'string' ? body.paginaInicioId : null;

  return setLandingBuilderPaginaInicio(paginaInicioId);
});
