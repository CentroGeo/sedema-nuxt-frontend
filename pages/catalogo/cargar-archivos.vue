<script setup>
import { useAuth, useRuntimeConfig } from '#imports';
import { useCatalogoStore } from '@/stores/catalogo';
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { convertirBytes } from '~/utils/catalogo';
import { LIMITE_CARGA_ARCHIVOS_MIB } from '#shared/utils/limiteCargaArchivos';

definePageMeta({
  middleware: 'sidebase-auth',
  bodyAttrs: {
    class: '',
  },
});

const storeCatalogo = useCatalogoStore();
const configEnv = useRuntimeConfig();
const statusOk = ref(false);
const archivosEnCarga = ref([]);
const hayCargas = ref(false);
const { data } = useAuth();
const { gnoxyFetch } = useGnoxyUrl();
const { uploadFile, getQuota, pollJob, importToGeonode } = useDataImporter();

// Extensiones espaciales base soportadas (vectoriales y ráster como GeoTIFF)
const base_files = ['.geojson', '.gpkg', '.zip', '.tif', '.tiff', '.geotiff'];
const docs_files = ['.txt', '.pdf'];
const sld_files = ['.sld'];
const xml_files = ['.xml'];
const FORMATOS_TABULARES = ['csv', 'xlsx', 'xls', 'json'];
const SHAPEFILE_PARTS = new Set(['shp', 'dbf', 'shx', 'prj', 'cpg', 'sbn', 'sbx']);
const REQUIRED_SHAPEFILE_EXTENSIONS = ['shp', 'dbf', 'shx', 'prj'];

const cuota = ref(null);
const cuotaCargando = ref(true);
const cuotaError = ref('');
const mensajeCuota = ref('');

const puedeCargar = computed(() => cuota.value?.can_upload === true);

async function actualizarCuota() {
  const token = data.value?.accessToken;

  if (!token) {
    cuotaCargando.value = true;
    return;
  }

  cuotaCargando.value = true;
  cuotaError.value = '';

  try {
    cuota.value = await getQuota(token);
  } catch (error) {
    cuota.value = null;
    cuotaError.value = error?.message || 'No fue posible consultar los espacios disponibles.';
  } finally {
    cuotaCargando.value = false;
  }
}

watch(
  () => data.value?.accessToken,
  (token) => {
    if (token) actualizarCuota();
  },
  { immediate: true }
);

const EXTENSIONES_AVISABLES = new Set(['sld', 'xml']);

// El GDAL de GeoNode (3.4) rechaza GeoPackage 1.3/1.4 (los escriben QGIS/GDAL
// recientes). Bajar user_version a 1.2 no altera los datos: son los bytes 60-63
// del header SQLite, sin suma de verificación.
async function normalizarVersionGpkg(file) {
  if (!file.name.toLowerCase().endsWith('.gpkg')) return file;
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength < 64) return file;
  const vista = new DataView(buffer);
  const cabecera = new TextDecoder().decode(new Uint8Array(buffer, 0, 15));
  if (cabecera !== 'SQLite format 3') return file;
  if (vista.getUint32(60) <= 10200) return file;
  vista.setUint32(60, 10200);
  return new File([buffer], file.name, { type: file.type });
}

// Mensajes que ve la persona usuaria cuando falla el procesamiento de una capa.
// La causa se clasifica a partir del log del importador; los dos caminos de carga
// (respuesta directa del servidor y monitoreo desde el cliente) usan esta misma
// tabla para que el mensaje no dependa de cuánto tardó el procesamiento.
const PATRON_NOMBRE_DE_CAPA = /Error layer:|RQ1|Layer names must/i;
const PATRON_CRS = /\bCRS\b|\bSRS\b|coordinate reference|projection|proyecci/i;

function mensajeErrorProcesamiento(log) {
  const texto = log || '';
  if (PATRON_NOMBRE_DE_CAPA.test(texto)) {
    return (
      'El nombre interno de la capa no es válido: debe iniciar con letra y usar solo minúsculas, ' +
      'números y guiones bajos (sin mayúsculas, guiones ni espacios). Renombra la capa dentro ' +
      'del archivo y vuelve a intentarlo.'
    );
  }
  if (PATRON_CRS.test(texto)) {
    return (
      'El archivo no declara un sistema de coordenadas reconocible. Asígnale uno ' +
      '(idealmente EPSG:4326) y vuelve a subirlo.'
    );
  }
  return 'No fue posible procesar tu archivo. Puede estar dañado o contener geometrías no válidas.';
}

function conDetalleTecnico(mensaje, log) {
  return log ? `${mensaje} — Detalle técnico: ${log}` : mensaje;
}

async function limpiarZipShapefile(file) {
  if (!file.name.toLowerCase().endsWith('.zip')) return { file, excluidos: [] };

  const { default: JSZip } = await import('jszip');
  let zip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    return { file, excluidos: [] };
  }

  const nombres = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  const tieneShp = nombres.some((n) => n.split('/').pop()?.toLowerCase().endsWith('.shp'));
  if (!tieneShp) return { file, excluidos: [] };

  const nuevoZip = new JSZip();
  const excluidos = [];
  for (const nombre of nombres) {
    const nombreBase = nombre.split('/').pop();
    const ext = nombre.split('.').pop()?.toLowerCase() || '';
    if (SHAPEFILE_PARTS.has(ext)) {
      nuevoZip.file(nombreBase, await zip.files[nombre].async('arraybuffer'));
    } else if (EXTENSIONES_AVISABLES.has(ext)) {
      excluidos.push(nombreBase);
    }
  }

  const blob = await nuevoZip.generateAsync({ type: 'blob' });
  return { file: new File([blob], file.name, { type: 'application/zip' }), excluidos };
}

async function agruparShapefilesSueltos(archivos) {
  const { default: JSZip } = await import('jszip');
  const grupos = new Map();

  for (const file of archivos) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!SHAPEFILE_PARTS.has(ext)) continue;
    const base = file.name.slice(0, file.name.lastIndexOf('.'));
    const claveGrupo = base.toLowerCase();
    if (!grupos.has(claveGrupo)) grupos.set(claveGrupo, { displayBase: base, partes: [] });
    grupos.get(claveGrupo).partes.push(file);
  }

  const noShapefile = archivos.filter((f) => {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    return !SHAPEFILE_PARTS.has(ext);
  });

  const resultados = [...noShapefile];
  const errores = [];

  for (const { displayBase, partes } of grupos.values()) {
    const extensionesPresentes = new Set(partes.map((f) => f.name.split('.').pop().toLowerCase()));
    const faltantes = REQUIRED_SHAPEFILE_EXTENSIONS.filter((ext) => !extensionesPresentes.has(ext));
    if (faltantes.length) {
      errores.push({
        nombre: partes.map((f) => f.name).join(', '),
        motivo: `Faltan archivos requeridos del shapefile: ${faltantes.map((e) => `.${e}`).join(', ')}`,
      });
      continue;
    }
    const zip = new JSZip();
    for (const f of partes) {
      // GeoNode empareja las partes del shapefile por nombre base exacto (sensible a
      // mayúsculas); se normalizan todas al mismo nombre para que las reconozca como
      // un solo shapefile aunque el usuario las haya nombrado con distinto casing.
      const ext = f.name.split('.').pop().toLowerCase();
      zip.file(`${displayBase}.${ext}`, await f.arrayBuffer());
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const zipFile = new File([blob], `${displayBase}.zip`, { type: 'application/zip' });
    resultados.push(zipFile);
  }

  return { archivos: resultados, errores };
}

async function guardarArchivo(files) {
  mensajeCuota.value = '';

  const archivosRaw = Array.from(files || []);

  // Limpiar ZIPs de INEGI (y similares) que traen archivos extra no reconocidos por GeoNode
  // y normalizar GeoPackage 1.3/1.4 a 1.2 para el GDAL del servidor
  const archivosLimpios = await Promise.all(
    archivosRaw.map(async (f) => {
      const { file, excluidos } = await limpiarZipShapefile(f);
      return { file: await normalizarVersionGpkg(file), excluidos };
    })
  );
  const excluidosPorArchivo = new Map(
    archivosLimpios.map(({ file, excluidos }) => [file, excluidos])
  );

  // Agrupar shapefiles sueltos en ZIPs antes de validar cuota
  const { archivos: listaArchivos, errores: erroresShapefile } = await agruparShapefilesSueltos(
    archivosLimpios.map(({ file }) => file)
  );

  await actualizarCuota();

  if (!cuota.value) {
    mensajeCuota.value = 'No fue posible validar los espacios disponibles.';
    return;
  }

  if (!cuota.value.can_upload) {
    return;
  }

  if (listaArchivos.length > cuota.value.remaining) {
    mensajeCuota.value = `Solo tienes ${cuota.value.remaining} espacios disponibles.`;
    return;
  }

  archivosEnCarga.value = [];
  hayCargas.value = true;
  const token = ref(data.value?.accessToken);

  // Mostrar errores de componentes shapefile sin .shp principal
  for (const err of erroresShapefile) {
    archivosEnCarga.value.push(
      reactive({
        nombre: err.nombre,
        extension: '',
        tamanio: '',
        estatus: 'error_carga',
        mensaje: err.motivo,
        IdRutaArchivo: null,
        numero_geometrias: null,
        proyeccion: null,
        tipo_recurso: null,
        jobId: null,
        jobSchema: null,
        geoCapabilidad: null,
        nombreEstilo: '',
        datasetPkSeleccionado: null,
        datasetsBuscados: [],
        busquedaDataset: '',
      })
    );
  }

  const nuevosArchivos = listaArchivos.map((file) => {
    const excluidos = excluidosPorArchivo.get(file);
    return reactive({
      nombre: file.name,
      extension: file.name.split('.').slice(-1)[0],
      tamanio: convertirBytes(file.size),
      estatus: 'pendiente',
      mensaje: 'Preparando carga...',
      notaExcluidos: excluidos?.length
        ? `Se excluyeron del zip por no ser parte del shapefile: ${excluidos.join(', ')}. Súbelos por separado con "Elige Archivo".`
        : '',
      IdRutaArchivo: null,
      numero_geometrias: null,
      proyeccion: null,
      tipo_recurso: null,
      jobId: null,
      jobSchema: null,
      geoCapabilidad: null,
      // SLD
      nombreEstilo: file.name.replace(/\.sld$/i, ''),
      // XML metadata
      datasetPkSeleccionado: null,
      datasetsBuscados: [],
      busquedaDataset: '',
      // Referencia al File original (no reactivo)
      _file: file,
    });
  });

  archivosEnCarga.value.push(...nuevosArchivos);

  nuevosArchivos.forEach(async (archivo, idx) => {
    const file = listaArchivos[idx];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // Flujo SIGIC para tabulares
    if (FORMATOS_TABULARES.includes(ext)) {
      archivo.estatus = 'analizando_tabular';
      archivo.mensaje = 'Analizando columnas del archivo…';
      try {
        const importJob = await uploadFile(file, data.value?.accessToken);
        archivo.jobId = importJob.id;
        await actualizarCuota();
        await esperarAnalisis(archivo);
        archivo.geoCapabilidad = calcularGeoCapabilidad(archivo.jobSchema);
        archivo.estatus = 'decision_tabular';
        archivo.mensaje = '';
      } catch (error) {
        archivo.estatus = 'error_carga';
        archivo.mensaje = error?.message || 'Error al analizar el archivo.';
        await actualizarCuota();
      }
      return;
    }

    // SLD: marcar como esperando nombre antes de procesar
    if (sld_files.some((end) => file.name.toLowerCase().endsWith(end))) {
      archivo.estatus = 'esperando_nombre_estilo';
      archivo.mensaje = '';
      return;
    }

    // XML: marcar como esperando selección de dataset
    if (xml_files.some((end) => file.name.toLowerCase().endsWith(end))) {
      archivo.estatus = 'esperando_dataset_xml';
      archivo.mensaje = '';
      return;
    }

    let endpoint = null;

    if (base_files.some((end) => file.name.toLowerCase().endsWith(end))) {
      endpoint = `${configEnv.app.baseURL}api/cargar-base-file`;
    } else if (docs_files.some((end) => file.name.toLowerCase().endsWith(end))) {
      endpoint = `${configEnv.app.baseURL}api/cargar-doc-file`;
    } else {
      archivo.estatus = 'error_carga';
      archivo.mensaje = 'Formato no soportado';
      return;
    }

    try {
      const formData = new FormData();
      if (base_files.some((end) => file.name.toLowerCase().endsWith(end))) {
        formData.append('base_file', file);
      } else {
        formData.append('doc_file', file);
      }
      formData.append('token', token.value);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || result.statusMessage || `Error ${response.status} al subir el archivo`
        );
      }

      // Evaluar respuesta
      if (!result.success) {
        archivo.estatus = 'error_carga';
        // result.detail solo viene del caso 'failed': trae el log del importador
        archivo.mensaje = result.detail
          ? conDetalleTecnico(mensajeErrorProcesamiento(result.detail), result.detail)
          : result.message || 'Error en procesamiento';
      } else if (result.execution_id) {
        // Caso: capa base, procesando en GeoNode
        archivo.estatus = 'procesando';
        archivo.mensaje = 'Procesando capa en GeoNode...';
        monitorLayerImport(result.execution_id, archivo);
      } else if (result.url) {
        const idRecurso = result.url.split('/').slice(-1)[0];
        if (base_files.includes('.' + file.name.split('.').slice(-1)[0])) {
          await finalizarCargaDataset(archivo, idRecurso);
        }
        // Caso: documento cargado
        archivo.IdRutaArchivo = result.url.split('/').slice(-1)[0];
        // Se recupera la información necesaria para cada tipo de archivo
        let tipo;
        if (base_files.some((end) => file.name.toLowerCase().endsWith(end))) {
          const request_geonode = await gnoxyFetch(
            `${configEnv.public.geonodeUrl}/api/v2/datasets/${archivo.IdRutaArchivo}`
          );
          const res_geonode = await request_geonode.json();
          tipo = isGeometricExtension(res_geonode.dataset.extent) ? 'dataLayer' : 'dataTable';
          if (tipo === 'dataLayer') {
            archivo.tipo_recurso = tipo;
            const proyeccion = res_geonode?.dataset?.srid;
            archivo.proyeccion = proyeccion;
            // Para archivos ráster (GeoTIFF, etc.) se omite la consulta WFS de conteo de geometrías ya que no son capas vectoriales
            const esRaster =
              res_geonode?.dataset?.subtype === 'raster' ||
              ['.tif', '.tiff', '.geotiff'].some((end) => file.name.toLowerCase().endsWith(end));
            if (!esRaster && res_geonode?.dataset?.alternate) {
              try {
                const request_geoserver = await gnoxyFetch(
                  `${configEnv.public.geonodeUrl}/gs/ows?service=WFS&version=1.1.0&request=GetFeature&typeName=${res_geonode.dataset.alternate}&resultType=hits`
                );
                const res_geoserver = await request_geoserver.text();
                const match = res_geoserver.match(/numberOfFeatures="(\d+)"/);
                archivo.numero_geometrias = match ? parseInt(match[1], 10) : null;
              } catch (e) {
                console.warn('No se pudo obtener el conteo de geometrías WFS:', e);
              }
            } else {
              archivo.numero_geometrias = null;
            }
          } else if (tipo === 'dataTable') {
            archivo.tipo_recurso = tipo;
          }
        } else {
          // Caso: documento cargado
          archivo.IdRutaArchivo = idRecurso;
          archivo.tipo_recurso = 'document';
          archivo.estatus = 'carga_finalizada';
          archivo.mensaje = 'Archivo cargado correctamente';
          statusOk.value = true;
        }
      } else {
        archivo.estatus = 'error_carga';
        archivo.mensaje = 'Respuesta inesperada del servidor';
      }

      await actualizarCuota();
    } catch (error) {
      archivo.estatus = 'error_carga';
      archivo.mensaje = error?.message || 'Error de red';
      await actualizarCuota();
      console.error(error);
    }
  });
}

// Polling para análisis SIGIC de tabulares
async function esperarAnalisis(archivo) {
  for (let i = 0; i < 48; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const jobData = await pollJob(archivo.jobId, data.value?.accessToken);
    if (jobData.status === 'ready') {
      archivo.jobSchema = jobData.column_schema;
      return;
    }
    if (jobData.status === 'error') throw new Error(jobData.error_message || 'Error analizando');
  }
  throw new Error('Tiempo de análisis agotado');
}

function calcularGeoCapabilidad(schema) {
  if (!schema) return null;
  const roles = schema.map((c) => c.geo_role).filter(Boolean);
  if (roles.includes('lat') && roles.includes('lon')) return 'Columnas de coordenadas detectadas';
  if (roles.some((r) => ['mun_key', 'state_key'].includes(r))) return 'Claves INEGI detectadas';
  if (roles.some((r) => ['mun_name', 'state_name'].includes(r)))
    return 'Nombres geográficos detectados';
  return null;
}

function irAImportador(archivo) {
  navigateTo(`/geocontenidos/importar-datos?job=${archivo.jobId}`);
}

async function subirComoTabular(archivo) {
  archivo.estatus = 'procesando';
  archivo.mensaje = 'Importando datos a GeoNode…';
  try {
    await importToGeonode(archivo.jobId, data.value?.accessToken);
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const jobData = await pollJob(archivo.jobId, data.value?.accessToken);
      if (jobData.status === 'done') {
        archivo.estatus = 'carga_finalizada';
        archivo.mensaje = 'Archivo cargado correctamente como tabla.';
        statusOk.value = true;
        await actualizarCuota();
        return;
      }
      if (jobData.status === 'error') throw new Error(jobData.error_message || 'Error importando');
    }
    throw new Error('El procesamiento está tardando más de lo esperado.');
  } catch (e) {
    archivo.estatus = 'error_carga';
    archivo.mensaje = e.message || 'Error al importar.';
  }
}

async function subirSLD(archivo, file) {
  archivo.estatus = 'procesando';
  archivo.mensaje = 'Subiendo estilo SLD…';
  try {
    const formData = new FormData();
    formData.append('sld_file', file);
    formData.append('style_name', archivo.nombreEstilo || file.name.replace(/\.sld$/i, ''));
    formData.append('token', data.value?.accessToken);

    const response = await fetch(`${configEnv.app.baseURL}api/cargar-sld-file`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.statusMessage || `Error ${response.status}`);
    }

    archivo.estatus = 'sld_cargado';
    archivo.mensaje = `Estilo "${result.style_name}" creado en GeoServer`;
  } catch (e) {
    archivo.estatus = 'error_carga';
    archivo.mensaje = e.message || 'Error al subir el estilo SLD';
  }
}

async function buscarDatasets(archivo, query) {
  if (!query || query.length < 2) {
    archivo.datasetsBuscados = [];
    return;
  }
  try {
    const res = await gnoxyFetch(
      `${configEnv.public.geonodeUrl}/api/v2/datasets/?search=${encodeURIComponent(query)}&page_size=10`
    );
    const json = await res.json();
    archivo.datasetsBuscados = json.datasets || [];
  } catch {
    archivo.datasetsBuscados = [];
  }
}

async function importarMetadatosXML(archivo, file) {
  if (!archivo.datasetPkSeleccionado) {
    archivo.mensaje = 'Selecciona una capa de destino primero';
    return;
  }
  archivo.estatus = 'procesando';
  archivo.mensaje = 'Importando metadatos XML…';
  try {
    const formData = new FormData();
    formData.append('xml_file', file);
    formData.append('dataset_pk', String(archivo.datasetPkSeleccionado));
    formData.append('token', data.value?.accessToken);

    const response = await fetch(`${configEnv.app.baseURL}api/importar-xml-metadatos`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.statusMessage || `Error ${response.status}`);
    }

    archivo.estatus = 'xml_importado';
    archivo.mensaje = result.message || 'Metadatos importados correctamente';
  } catch (e) {
    archivo.estatus = 'error_carga';
    archivo.mensaje = e.message || 'Error al importar metadatos XML';
  }
}

// Consulta los datos del dataset recién creado y marca la tarjeta como finalizada
async function finalizarCargaDataset(archivo, idRecurso) {
  if (idRecurso) archivo.IdRutaArchivo = String(idRecurso);
  try {
    const request_geonode = await gnoxyFetch(
      `${configEnv.public.geonodeUrl}/api/v2/datasets/${archivo.IdRutaArchivo}`
    );
    const res_geonode = await request_geonode.json();
    const tipo = isGeometricExtension(res_geonode.dataset.extent) ? 'dataLayer' : 'dataTable';
    archivo.tipo_recurso = tipo;
    if (tipo === 'dataLayer') {
      const request_geoserver = await gnoxyFetch(
        `${configEnv.public.geonodeUrl}/gs/ows?service=WFS&version=1.1.0&request=GetFeature&typeName=${res_geonode.dataset.alternate}&resultType=hits`
      );
      archivo.proyeccion = res_geonode?.dataset?.srid;
      const res_geoserver = await request_geoserver.text();
      const match = res_geoserver.match(/numberOfFeatures="(\d+)"/);
      archivo.numero_geometrias = match ? parseInt(match[1], 10) : null;
    }
  } catch (e) {
    console.error('Error consultando el dataset creado:', e);
  }
  archivo.estatus = 'carga_finalizada';
  archivo.mensaje =
    archivo.tipo_recurso === 'dataLayer'
      ? 'Capa cargada correctamente'
      : archivo.tipo_recurso === 'dataTable'
        ? 'Tabla cargada correctamente'
        : 'Archivo cargado correctamente';
  statusOk.value = true;
  await actualizarCuota();
}

// Polling para monitorear la importación de capas base.
// GeoNode 4.4 responde /api/v2/executionrequest/{id} envuelto en {"request": {...}}
// con estados en minúsculas: ready | running | failed | finished.
const monitoresActivos = new Set();

onBeforeUnmount(() => {
  monitoresActivos.forEach((id) => clearInterval(id));
  monitoresActivos.clear();
});

async function monitorLayerImport(executionId, archivo) {
  const startTime = Date.now();
  const LIMITE_MONITOREO_MS = 10 * 60 * 1000;

  const interval = setInterval(async () => {
    try {
      const res = await gnoxyFetch(
        `${configEnv.public.geonodeUrl}/api/v2/executionrequest/${executionId}`
      );
      if (!res.ok) return; // error transitorio: se reintenta en el siguiente tick

      const json = await res.json();
      const ejecucion = json?.request ?? json;

      if (ejecucion?.status === 'finished') {
        clearInterval(interval);
        monitoresActivos.delete(interval);
        const idRecurso =
          ejecucion.geonode_resource ??
          ejecucion.output_params?.resources?.[0]?.id ??
          ejecucion.output_params?.resources?.[0]?.pk;
        await finalizarCargaDataset(archivo, idRecurso);
        return;
      }

      if (ejecucion?.status === 'failed') {
        clearInterval(interval);
        monitoresActivos.delete(interval);
        archivo.estatus = 'error_carga';
        archivo.mensaje = conDetalleTecnico(
          mensajeErrorProcesamiento(ejecucion.log),
          ejecucion.log
        );
        await actualizarCuota();
        return;
      }

      if (Date.now() - startTime > LIMITE_MONITOREO_MS) {
        clearInterval(interval);
        monitoresActivos.delete(interval);
        archivo.estatus = 'procesando_fondo';
        archivo.mensaje =
          'Tu capa sigue en proceso. Aparecerá en "Mis archivos" al terminar; ' +
          'puedes salir de esta página sin perder la carga.';
      }
    } catch (e) {
      console.error('Error consultando ejecución:', e);
    }
  }, 5000);

  monitoresActivos.add(interval);
}
</script>

<template>
  <UiLayoutPaneles :estado-colapable="storeCatalogo.catalogoColapsado">
    <template #catalogo>
      <CatalogoListaMenuLateral />
    </template>

    <template #visualizador>
      <main id="principal" class="contenedor m-b-10">
        <div class="alineacion-izquierda ancho-lectura">
          <h2>Carga archivo</h2>
          <p class="m-y-1">
            <b
              >Formatos admitidos: GeoJSON, GeoPackage, Shapefile (ZIP o archivos sueltos), GeoTIFF
              / Ráster (.tif, .tiff), CSV, XLSX, XLS, JSON, PDF, TXT, SLD y XML (ISO 19115).</b
            >
          </p>
          <p class="m-y-1">Tamaño máximo por archivo: {{ LIMITE_CARGA_ARCHIVOS_MIB }} MiB.</p>
          <p
            class="texto-color-informacion fondo-color-informacion borde borde-color-informacion borde-redondeado-2 p-2 m-y-2"
          >
            Los archivos tabulares (CSV, Excel, JSON) se analizan automáticamente para detectar
            columnas geográficas, lo que permite la espacialización de datos tabulares mediante la
            construcción de geometrías de puntos.
          </p>
          <!-- Si el archivo contiene datos de coordenadas pero estos no siguen la
            nomenclatura establecida, serán procesados como cualquier otro valor numérico sin
            interpretación geoespacial.-->

          <div v-if="cuotaCargando" class="fondo-color-neutro borde borde-redondeado-8 p-2 m-y-2">
            Consultando espacios disponibles...
          </div>

          <div
            v-else-if="cuota"
            class="fondo-color-informacion texto-color-informacion borde borde-redondeado-8 p-2 m-y-2"
          >
            <p>
              <strong>{{ cuota.used }} de {{ cuota.limit }} espacios utilizados.</strong>
            </p>
            <p>
              Te quedan {{ cuota.remaining }}
              {{ cuota.remaining === 1 ? 'espacio disponible' : 'espacios disponibles' }}.
            </p>
            <p v-if="!cuota.can_upload" class="texto-color-error m-t-1">
              Alcanzaste el límite. Se liberará espacio cuando un administrador apruebe contenido.
            </p>
          </div>

          <p v-if="cuotaError || mensajeCuota" class="texto-color-error m-y-2">
            {{ mensajeCuota || cuotaError }}
          </p>

          <ClientOnly>
            <CatalogoElementoDragNdDrop
              :disabled="cuotaCargando || !puedeCargar"
              @pasar-archivo="(i) => guardarArchivo(i)"
            />
          </ClientOnly>

          <h2 v-if="hayCargas">Cargas</h2>

          <div v-for="(archivo, i) in archivosEnCarga" :key="i" class="tarjetitas-carga">
            <div
              class="p-b-3 p-x-3 borde-redondeado-16 m-y-3"
              :class="{
                'fondo-color-confirmacion': [
                  'carga_finalizada',
                  'sld_cargado',
                  'xml_importado',
                ].includes(archivo.estatus),
                'fondo-color-error': archivo.estatus == 'error_carga',
                'fondo-color-neutro': [
                  'pendiente',
                  'procesando',
                  'procesando_fondo',
                  'analizando_tabular',
                  'decision_tabular',
                  'esperando_nombre_estilo',
                  'esperando_dataset_xml',
                ].includes(archivo.estatus),
              }"
            >
              <div>
                <div class="flex flex-contenido-separado">
                  <div class="flex-vertical-centrado">
                    <p>
                      <span
                        v-if="
                          ['pendiente', 'procesando', 'analizando_tabular'].includes(
                            archivo.estatus
                          )
                        "
                        class="pictograma-de-carga-sigic"
                      >
                        <img
                          :src="`${configEnv.app.baseURL}img/loader.gif`"
                          alt="cargando"
                          class="color-invertir"
                        />
                      </span>
                      {{ archivo.nombre }}
                    </p>
                  </div>
                  <div class="flex">
                    <p class="borde borde-redondeado-8" style="padding: 4px">
                      .{{ archivo.extension }}
                    </p>
                    <p class="flex flex-vertical-centrado">
                      {{ archivo.tamanio }}
                    </p>
                  </div>
                </div>
                <div
                  :class="{
                    'texto-color-confirmacion': [
                      'carga_finalizada',
                      'sld_cargado',
                      'xml_importado',
                    ].includes(archivo.estatus),
                    'texto-color-error': archivo.estatus == 'error_carga',
                  }"
                >
                  <div class="flex">
                    <span
                      :class="{
                        'pictograma-aprobado': [
                          'carga_finalizada',
                          'sld_cargado',
                          'xml_importado',
                        ].includes(archivo.estatus),
                        'pictograma-alerta': archivo.estatus == 'error_carga',
                      }"
                    />
                    <b>{{ archivo.mensaje }}</b>
                  </div>
                  <p v-if="archivo.notaExcluidos" class="m-t-1">{{ archivo.notaExcluidos }}</p>

                  <!-- Estilos SLD: campo de nombre + botón de carga -->
                  <div
                    v-if="archivo.estatus === 'esperando_nombre_estilo'"
                    class="decision-tabular m-t-2"
                  >
                    <p class="m-b-1">
                      <strong>Estilo SLD.</strong> Confirma o edita el nombre del estilo:
                    </p>
                    <div class="flex" style="gap: 8px; align-items: center; flex-wrap: wrap">
                      <input
                        v-model="archivo.nombreEstilo"
                        type="text"
                        class="campo-texto"
                        placeholder="nombre_del_estilo"
                        style="flex: 1; min-width: 160px"
                      />
                      <button
                        class="boton-primario boton-chico"
                        :disabled="!archivo.nombreEstilo"
                        @click="subirSLD(archivo, archivo._file)"
                      >
                        Subir estilo
                      </button>
                    </div>
                  </div>

                  <!-- Metadatos XML: buscador de dataset + botón de importación -->
                  <div
                    v-if="archivo.estatus === 'esperando_dataset_xml'"
                    class="decision-tabular m-t-2"
                  >
                    <p class="m-b-1">
                      <strong>Metadatos XML (ISO 19115).</strong> Selecciona la capa a la que se
                      importarán:
                    </p>
                    <input
                      v-model="archivo.busquedaDataset"
                      type="text"
                      class="campo-texto"
                      placeholder="Buscar capa por nombre…"
                      style="width: 100%; margin-bottom: 6px"
                      @input="buscarDatasets(archivo, archivo.busquedaDataset)"
                    />
                    <ul v-if="archivo.datasetsBuscados.length" class="lista-datasets-xml">
                      <li
                        v-for="ds in archivo.datasetsBuscados"
                        :key="ds.pk"
                        :class="{ seleccionado: archivo.datasetPkSeleccionado === ds.pk }"
                        @click="
                          archivo.datasetPkSeleccionado = ds.pk;
                          archivo.busquedaDataset = ds.title;
                        "
                      >
                        {{ ds.title }}
                      </li>
                    </ul>
                    <button
                      class="boton-primario boton-chico m-t-1"
                      :disabled="!archivo.datasetPkSeleccionado"
                      @click="importarMetadatosXML(archivo, archivo._file)"
                    >
                      Importar metadatos
                    </button>
                  </div>

                  <!-- Estilo SLD cargado correctamente -->
                  <div v-if="archivo.estatus === 'sld_cargado'" class="m-t-1">
                    <p class="texto-chico">
                      Estilo disponible en GeoServer como
                      <strong>{{ archivo.nombreEstilo }}</strong
                      >. Puedes aplicarlo desde la edición de cualquier capa.
                    </p>
                  </div>

                  <!-- Decisión para archivos tabulares -->
                  <div v-if="archivo.estatus === 'decision_tabular'" class="decision-tabular m-t-2">
                    <p class="m-b-1">
                      <strong>Archivo tabular detectado.</strong> ¿Cómo deseas subirlo?
                    </p>
                    <p
                      v-if="archivo.geoCapabilidad"
                      class="texto-chico texto-color-confirmacion m-b-2"
                    >
                      ✓ {{ archivo.geoCapabilidad }}
                    </p>
                    <div class="decision-botones">
                      <button class="boton-primario boton-chico" @click="irAImportador(archivo)">
                        Georreferenciar y crear geocontenido →
                      </button>
                      <button
                        class="boton-secundario boton-chico"
                        @click="subirComoTabular(archivo)"
                      >
                        Subir como datos tabulares
                      </button>
                    </div>
                  </div>

                  <div
                    v-if="archivo.numero_geometrias && archivo.estatus === 'carga_finalizada'"
                    class="nota"
                  >
                    Se detectaron {{ archivo.numero_geometrias }} geometrías <br />
                    Sistema de referencia {{ archivo.proyeccion }}
                  </div>

                  <div
                    v-if="
                      archivo.proyeccion &&
                      archivo.estatus === 'carga_finalizada' &&
                      !['EPSG:4326', 'EPSG:3857'].includes(archivo.proyeccion)
                    "
                    class="texto-color-advertencia fondo-color-advertencia borde borde-color-advertencia borde-redondeado-2 p-2 m-t-1"
                  >
                    <strong>⚠ Sistema de coordenadas convertido automáticamente</strong><br />
                    Tu archivo fue cargado en <strong>{{ archivo.proyeccion }}</strong
                    >. La plataforma lo convirtió a EPSG:4326 para su correcta visualización.<br /><br />
                    Sistemas de referencia válidos para el visor:<br />
                    • <strong>EPSG:4326</strong> — WGS 84 (recomendado)<br />
                    • <strong>EPSG:3857</strong> — Web Mercator<br /><br />
                    No es necesario realizar ninguna acción adicional.
                  </div>

                  <div
                    v-if="archivo.IdRutaArchivo && archivo.estatus === 'carga_finalizada'"
                    class="flex flex-contenido-inicio"
                  >
                    <div class="m-x-2 m-y-1">
                      <NuxtLink
                        :to="`/catalogo/mis-recursos/editar/MetadatosBasicos?data=${archivo.IdRutaArchivo}&type=${archivo.tipo_recurso}`"
                        target="_blank"
                        >Editar metadatos</NuxtLink
                      >
                    </div>
                    <div v-if="archivo.tipo_recurso === 'dataLayer'" class="m-x-2 m-y-1">
                      <NuxtLink
                        :to="`/catalogo/mis-recursos/editar/estilo?data=${archivo.IdRutaArchivo}&type=dataLayer`"
                      >
                        Agregar un estilo (.sld)</NuxtLink
                      >
                    </div>
                    <!-- <div>
                      <NuxtLink to="/catalogo/mis-recursos/metadatos-pendientes">
                        Ver en Mis recursos</NuxtLink
                      >
                    </div> -->
                  </div>
                </div>
              </div>
              <div v-if="archivo.estatus == 'carga_finalizada'" class=""></div>
            </div>
          </div>
        </div>
      </main>
    </template>
  </UiLayoutPaneles>
</template>
<style lang="scss">
.decision-tabular {
  padding: 12px 0 4px;

  .decision-botones {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }
}

.lista-datasets-xml {
  list-style: none;
  padding: 0;
  margin: 0 0 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  max-height: 160px;
  overflow-y: auto;

  li {
    padding: 6px 10px;
    cursor: pointer;
    font-size: 0.9em;

    &:hover,
    &.seleccionado {
      background: var(--color-informacion, #e8f4fd);
    }
  }
}

span.pictograma-de-carga-sigic {
  display: inline-flex;
  vertical-align: middle;
  padding: 0.25em;
  img {
    height: 16px;
    position: relative;
  }
}
</style>
