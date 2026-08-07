export default defineEventHandler(async (event) => {
  const logo = await getLandingBuilderLogoTercero();
  if (!logo) {
    throw createError({ statusCode: 404, statusMessage: 'No hay logo configurado' });
  }
  setHeader(event, 'content-type', logo.mimetype);
  setHeader(event, 'cache-control', 'no-cache');
  return logo.data;
});
