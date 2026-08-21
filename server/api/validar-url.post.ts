function construirUrlObjetivo(urlServicio: string, serverType: string) {
  const targetUrl = new URL(urlServicio);

  if (serverType === 'arcgis') {
    targetUrl.searchParams.set('f', 'json');
  } else {
    targetUrl.searchParams.set('service', 'WMS');
    targetUrl.searchParams.set('request', 'GetCapabilities');
  }

  return targetUrl.toString();
}

export default defineEventHandler(async (event) => {
  const { url, serverType } = await readBody(event);

  if (!url) {
    return {
      isValid: false,
      capabilities: '',
      version: '',
    };
  }

  try {
    const targetUrl = construirUrlObjetivo(url, serverType);
    const response = await fetch(targetUrl);

    if (!response.ok) {
      return {
        isValid: false,
        capabilities: '',
        version: '',
      };
    }

    if (serverType === 'arcgis') {
      const json = await response.json();

      return {
        isValid: json.capabilities?.includes('Map') || json.capabilities?.includes('Image'),
      };
    }

    const capabilities = await response.text();
    const isValid =
      /GetMap/i.test(capabilities) && !/ServiceExceptionReport|ExceptionReport/i.test(capabilities);

    const version =
      capabilities.match(
        /<(?:\w+:)?(?:WMS_Capabilities|WMT_MS_Capabilities)\b[^>]*\bversion=["']([^"']+)/i
      )?.[1] || '';

    return {
      isValid,
      capabilities: isValid ? capabilities : '',
      version,
    };
  } catch (error) {
    console.error('No fue posible validar el servicio remoto:', error);

    return {
      isValid: false,
      capabilities: '',
      version: '',
    };
  }
});
