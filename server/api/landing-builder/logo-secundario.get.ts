export default defineEventHandler(async (event) => {
  const logo = await getLandingBuilderLogoSecundario();
  if (!logo) {
    throw createError({ statusCode: 404, statusMessage: 'No hay logo secundario configurado' });
  }
  setHeader(event, 'content-type', logo.mimetype);
  setHeader(event, 'cache-control', 'no-cache');
  return logo.data;
});
