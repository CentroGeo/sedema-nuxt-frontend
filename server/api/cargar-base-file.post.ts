import formidable from 'formidable';
import { promises as fsp } from 'fs';
import { createError } from 'h3';
import { getServerSession } from '#auth';
import { LIMITE_CARGA_ARCHIVOS_BYTES } from '#shared/utils/limiteCargaArchivos';
import { parseUploadForm } from '../utils/parseUploadForm';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getAccessToken(event) {
  const session = await getServerSession(event);
  return session?.accessToken;
}

export default defineEventHandler(async (event) => {
  const configEnv = useRuntimeConfig();
  const form = formidable({ multiples: false, maxFileSize: LIMITE_CARGA_ARCHIVOS_BYTES });

  // Parseo del form data recibido
  const data = await parseUploadForm(form, event.node.req);

  const { base_file } = data.files;
  const token = await getAccessToken(event);

  if (!base_file || !token) {
    throw createError({ statusCode: 400, message: 'Archivo o sesión faltante' });
  }

  const quotaRes = await fetch(`${configEnv.public.geonodeApi}/data-importer/jobs/quota/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!quotaRes.ok) {
    throw createError({
      statusCode: quotaRes.status,
      message: 'No fue posible validar los espacios disponibles',
    });
  }

  const quota = await quotaRes.json();

  if (!quota.can_upload) {
    throw createError({
      statusCode: 409,
      message: 'Alcanzaste el límite de archivos y capas pendientes de aprobación.',
    });
  }

  // Crear FormData para enviar a GeoNode
  const formData = new FormData();
  const buffer = await fsp.readFile(base_file[0].filepath);
  const filename = base_file[0].originalFilename ?? 'archivo';
  const blob = new Blob([buffer], { type: base_file[0].mimetype });
  formData.append('base_file', blob, filename);

  // GeoNode requiere zip_file además de base_file para activar la extracción del ZIP
  if (filename.toLowerCase().endsWith('.zip')) {
    formData.append('zip_file', blob, filename);
  }

  try {
    // 1️⃣ Subir archivo al GeoNode
    const uploadRes = await fetch(`${configEnv.public.geonodeApi}/uploads/upload/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const uploadJson = await uploadRes.json();
    console.log('GeoNode upload response:', uploadJson);

    // Si no hay execution_id, devolver lo que haya
    const executionId = uploadJson?.execution_id;
    if (!executionId) {
      return uploadJson;
    }

    // 2️⃣ Espera corta: resuelve en línea las capas rápidas y detecta fallos inmediatos.
    //    GeoNode importa de forma asíncrona; si al agotar la espera sigue corriendo,
    //    se devuelve el execution_id y el cliente continúa el monitoreo sin bloquear.
    const statusUrl = `${configEnv.public.geonodeApi}/resource-service/execution-status/${executionId}`;
    let statusJson = null;
    const maxAttempts = 3; // 3 * 5s = 15s de espera en línea
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await delay(5000);
      // Se vuelve a pedir la sesión en cada intento: si el accessToken estaba por
      // expirar, el callback jwt() ya lo habrá refrescado entre un intento y otro.
      const pollToken = (await getAccessToken(event)) || token;
      const statusRes = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${pollToken}`,
        },
      });

      if (!statusRes.ok) {
        console.warn(`Error polling (intento ${attempt + 1}): ${statusRes.status}`);
        continue;
      }

      statusJson = await statusRes.json();
      console.log('GeoNode status:', statusJson?.status);

      if (statusJson?.status === 'finished' && statusJson?.output_params?.resources?.length > 0) {
        break;
      }

      if (statusJson?.status === 'failed') {
        break;
      }
    }

    // 3️⃣ Devolver resultado final al frontend
    if (statusJson?.status === 'finished' && statusJson?.output_params?.resources?.length > 0) {
      const resource = statusJson.output_params.resources[0];
      return {
        success: true,
        message: 'Procesamiento completado',
        id: resource.id,
        url: `${configEnv.public.geonodeUrl}${resource.detail_url}`,
        time: statusJson.finished,
      };
    } else if (statusJson?.status === 'failed') {
      return {
        success: false,
        message: statusJson?.log || 'GeoNode no pudo procesar el archivo.',
        status: 'failed',
        detail: statusJson?.log || null,
      };
    } else {
      // Sigue en proceso (o el sondeo corto no obtuvo respuesta): el cliente
      // continúa el monitoreo con el execution_id.
      return {
        success: true,
        execution_id: executionId,
        message: 'La capa sigue procesándose en GeoNode',
        status: statusJson?.status ?? 'running',
      };
    }
  } catch (error) {
    console.error('Error al subir al GeoNode:', error);
    throw createError({
      statusCode: 500,
      message: 'Error al subir al GeoNode',
      data: error,
    });
  }
});
