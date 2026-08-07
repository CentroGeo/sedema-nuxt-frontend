export default defineEventHandler(async (event) => {
  const bloqueId = getRouterParam(event, 'bloqueId');
  const tipo = getRouterParam(event, 'tipo');
  const itemId = getRouterParam(event, 'itemId');
  if (!bloqueId || !tipo || !itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Faltan parámetros de la imagen' });
  }

  const imagen = await getLandingBuilderBloqueImagen(bloqueId, tipo, itemId);
  if (!imagen) {
    throw createError({ statusCode: 404, statusMessage: 'No hay imagen configurada' });
  }
  setHeader(event, 'content-type', imagen.mimetype);
  setHeader(event, 'cache-control', 'no-cache');
  return imagen.data;
});
