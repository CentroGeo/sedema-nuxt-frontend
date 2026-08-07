export default defineEventHandler(async (event) => {
  const sectionId = event.context.params?.sectionId;
  const cardId = event.context.params?.cardId;
  if (!sectionId || !cardId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Falta el identificador de la sección o de la tarjeta',
    });
  }

  const logo = await getLandingBuilderCardImage(sectionId, cardId);
  if (!logo) {
    throw createError({ statusCode: 404, statusMessage: 'No hay imagen para esta tarjeta' });
  }
  setHeader(event, 'content-type', logo.mimetype);
  setHeader(event, 'cache-control', 'no-cache');
  return logo.data;
});
