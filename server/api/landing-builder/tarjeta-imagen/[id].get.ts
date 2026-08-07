export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el id de la tarjeta' });
  }

  const imagen = await getLandingBuilderTarjetaImagen(id);
  if (!imagen) {
    throw createError({ statusCode: 404, statusMessage: 'No hay imagen configurada' });
  }
  setHeader(event, 'content-type', imagen.mimetype);
  setHeader(event, 'cache-control', 'no-cache');
  return imagen.data;
});
