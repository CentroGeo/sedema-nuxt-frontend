import formidable from 'formidable';
import { promises as fsp } from 'fs';
import { createError } from 'h3';
import { LIMITE_CARGA_ARCHIVOS_BYTES } from '#shared/utils/limiteCargaArchivos';
import { parseUploadForm } from '../utils/parseUploadForm';

export const config = {
  api: {
    bodyParser: false,
  },
};
export default defineEventHandler(async (event) => {
  const configEnv = useRuntimeConfig();
  // Parsea FormData con formidable
  const form = formidable({ multiples: false, maxFileSize: LIMITE_CARGA_ARCHIVOS_BYTES });

  const data = await parseUploadForm(form, event.node.req);
  const { doc_file } = data.files;
  const token = data?.fields?.token?.[0];

  if (!doc_file || !token) {
    throw createError({ statusCode: 400, message: 'Archivo o token faltante' });
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

  const formData = new FormData();
  formData.append('title', doc_file[0].originalFilename);

  formData.append(
    'doc_file',
    doc_file[0].filepath
      ? new Blob([await fsp.readFile(doc_file[0].filepath)], {
          type: doc_file[0].mimetype,
        })
      : doc_file[0],
    doc_file[0].originalFilename
  );
  console.log(formData, data?.fields?.token?.[0]);
  try {
    const res = await fetch(`${configEnv.public.geonodeUrl}/documents/upload?no__redirect=true/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData as unknown as BodyInit,
    });

    console.log('response status:', res);
    const json = await res.json();
    console.log('json:', json);
    return json;
  } catch (error) {
    console.error('Error al subir al GeoNode:', error);
    throw createError({
      statusCode: 500,
      message: 'Error al subir al GeoNode',
      data: error,
    });
  }
});
