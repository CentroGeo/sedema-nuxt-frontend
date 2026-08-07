export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const token = getHeader(event, 'token');
  const pk = getHeader(event, 'pk');
  const baseUrl = config.public.geonodeApi;
  const url = `${baseUrl}/resources/${pk}/`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    //console.log('La respuesta:', response);
    if (!response.ok) {
      throw new Error(`Falló el borrar un recurso: ${response.status}`);
    }
    //const status = response.ok;
    return response.ok;
  } catch (error) {
    console.error('Error al borrar un recurso:', error);
    return false;
  }
});
