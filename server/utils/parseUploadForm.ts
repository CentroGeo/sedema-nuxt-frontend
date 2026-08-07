import type { Fields, Files } from 'formidable';
import formidable, { errors as formidableErrors } from 'formidable';
import { createError } from 'h3';
import type { IncomingMessage } from 'http';
import { LIMITE_CARGA_ARCHIVOS_MIB } from '#shared/utils/limiteCargaArchivos';

export function parseUploadForm(
  form: ReturnType<typeof formidable>,
  req: IncomingMessage
): Promise<{ fields: Fields; files: Files }> {
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (!err) {
        resolve({ fields, files });
        return;
      }

      if (err.code === formidableErrors.biggerThanMaxFileSize) {
        reject(
          createError({
            statusCode: 413,
            message: `El archivo excede el límite de ${LIMITE_CARGA_ARCHIVOS_MIB} MiB permitido.`,
          })
        );
        return;
      }

      reject(
        createError({ statusCode: 400, message: 'No fue posible procesar el archivo enviado.' })
      );
    });
  });
}
