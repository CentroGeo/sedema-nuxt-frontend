import { promises as fsp } from 'fs';

export interface LandingBuilderTarjeta {
  id: string;
  titulo: string;
  descripcion: string;
  textoBoton: string;
  enlaceBoton: string;
  imagenUrl: string | null;
}

export interface LandingBuilderCard {
  id: string;
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  urlDestino: string;
  textoBoton: string;
  tipoDestino: string;
  orientacion: string;
  tituloTipo?: string;
  tituloAlineacion?: string;
  descripcionTipo?: string;
  descripcionAlineacion?: string;
}

export interface LandingBuilderSection {
  id: string;
  tipo: 'tarjetas';
  datos: {
    disposicion: 'vertical' | 'horizontal';
    tarjetas: LandingBuilderCard[];
  };
}

export interface LandingBuilderConfig {
  nombrePlataforma: string;
  titulo: string;
  subtitulo: string;
  tituloSeccion: string;
  descripcion: string;
  seccionTexto: string;
  logoUrl: string | null;
  logoSecundarioUrl: string | null;
  logoTerceroUrl: string | null;
  logoCuartoUrl: string | null;
  logoRedirectUrl?: string | null;
  logoSecundarioRedirectUrl?: string | null;
  logoTerceroRedirectUrl?: string | null;
  logoCuartoRedirectUrl?: string | null;
  tarjetas: LandingBuilderTarjeta[];
  secciones?: LandingBuilderSection[];
  bloques?: LandingBuilderBloque[];
  paginas?: LandingBuilderPagina[];
  paginaInicioId?: string | null;
  actualizadoEn: string;
}

export interface LandingBuilderBloque {
  id: string;
  tipo:
    | 'portada'
    | 'titulo'
    | 'parrafo'
    | 'texto-imagen'
    | 'texto'
    | 'carrusel'
    | 'tarjetas'
    | 'mapa';
  etiqueta?: string;
  datos: Record<string, unknown>;
}

export interface LandingBuilderPaginaIdentidad {
  nombrePlataforma: string;
  logoUrl: string | null;
  logoSecundarioUrl: string | null;
  logoTerceroUrl: string | null;
  logoCuartoUrl: string | null;
  logoRedirectUrl?: string | null;
  logoSecundarioRedirectUrl?: string | null;
  logoTerceroRedirectUrl?: string | null;
  logoCuartoRedirectUrl?: string | null;
  // Controla la barra superior de identidad de Gobierno de México (el
  // escudo/marca oficial que se muestra sobre el encabezado). Ausente en
  // páginas creadas antes de esta opción; se trata como `true`.
  mostrarBarraGobMx?: boolean;
}

export interface LandingBuilderPagina {
  id: string;
  nombre: string;
  slug: string;
  bloques: LandingBuilderBloque[];
  identidad: LandingBuilderPaginaIdentidad;
  creadaEn: string;
}

export const IDENTIDAD_PAGINA_VACIA: LandingBuilderPaginaIdentidad = {
  nombrePlataforma: '',
  logoUrl: null,
  logoSecundarioUrl: null,
  logoTerceroUrl: null,
  logoCuartoUrl: null,
  mostrarBarraGobMx: true,
};

export interface LandingBuilderLogo {
  data: Buffer;
  mimetype: string;
}

export const LIMITE_TARJETAS = 10;
export const LIMITE_PAGINAS = 3;
export const TIPOS_LOGO_PAGINA_PERMITIDOS = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
];
export const TAMANO_MAXIMO_LOGO_PAGINA = 2 * 1024 * 1024; // 2MB

export function validarYObtenerMimetypeImagen(
  archivo: any,
  permitidos: string[] | readonly string[]
): string | null {
  if (!archivo) return null;
  const mimetype = archivo.mimetype || '';
  if (mimetype && permitidos.includes(mimetype)) {
    return mimetype;
  }
  const extension = archivo.originalFilename?.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'svg') return 'image/svg+xml';
  return null;
}

export const SLOTS_LOGO_PAGINA = ['logo1', 'logo2', 'logo3', 'logo4'] as const;
export const CAMPO_IDENTIDAD_POR_SLOT: Record<
  (typeof SLOTS_LOGO_PAGINA)[number],
  keyof Omit<LandingBuilderPaginaIdentidad, 'nombrePlataforma'>
> = {
  logo1: 'logoUrl',
  logo2: 'logoSecundarioUrl',
  logo3: 'logoTerceroUrl',
  logo4: 'logoCuartoUrl',
};

const CONFIG_KEY = 'config.json';
const LOGO_KEY = 'logo:archivo';
const LOGO_META_KEY = 'logo:meta.json';
const LOGO_SECUNDARIO_KEY = 'logo_secundario:archivo';
const LOGO_SECUNDARIO_META_KEY = 'logo_secundario:meta.json';
const LOGO_TERCERO_KEY = 'logo_tercero:archivo';
const LOGO_TERCERO_META_KEY = 'logo_tercero:meta.json';
const LOGO_CUARTO_KEY = 'logo_cuarto:archivo';
const LOGO_CUARTO_META_KEY = 'logo_cuarto:meta.json';

const tarjetaImagenKey = (id: string) => `tarjeta:${id}:archivo`;
const tarjetaImagenMetaKey = (id: string) => `tarjeta:${id}:meta.json`;

const tarjetasPorDefecto: LandingBuilderTarjeta[] = [
  {
    id: 'visualiza',
    titulo: 'Visualiza información territorial',
    descripcion:
      'Explora mapas interactivos con capas de información geográfica: datos económicos, límites administrativos, de infraestructura, población y más. Filtra por región, tema o periodo, combina fuentes y descarga tus mapas en formatos estándar.',
    textoBoton: 'Ir al visualizador',
    enlaceBoton: '/consulta',
    imagenUrl: '/inicio/tarjeta_visualiza.png',
  },
  {
    id: 'analiza',
    titulo: 'Analiza con Inteligencia Artificial',
    descripcion:
      'Crea un proyecto de análisis, sube tus documentos o selecciona fuentes del catálogo SIGIC, y haz preguntas en lenguaje natural. La IA lee, compara y resume la información para darte respuestas con referencias a las fuentes originales.',
    textoBoton: 'Iniciar análisis con IA',
    enlaceBoton: '/ia',
    imagenUrl: '/inicio/tarjeta_analiza.png',
  },
  {
    id: 'explora',
    titulo: 'Explora los recursos disponibles',
    descripcion:
      'Consulta el catálogo completo de recursos del SIGIC: capas geográficas, tablas de datos, documentos de investigación y otros servicios remotos. Busca por tema, institución, fecha o tipo de recurso, y descarga lo que necesites.',
    textoBoton: 'Ir al catálogo de información',
    enlaceBoton: '/catalogo',
    imagenUrl: '/inicio/tarjeta_explora.png',
  },
  {
    id: 'usa',
    titulo: 'Usa tu propia información',
    descripcion:
      'Sube tus archivos con información geográfica o científica, y úsalos directamente en el visualizador o en tus proyectos de análisis con IA. Sin necesidad de herramientas externas, puedes integrar tus datos al ecosistema SIGIC.',
    textoBoton: 'Ir a subir archivo',
    enlaceBoton: '/catalogo/cargar-archivos',
    imagenUrl: '/inicio/tarjeta_usa.png',
  },
];

const configPorDefecto: LandingBuilderConfig = {
  nombrePlataforma: '',
  titulo: 'Sistema Integral de Gestión de Información Científica (SIGIC)',
  subtitulo: 'Integra, visualiza y aprovecha el conocimiento científico de México',
  tituloSeccion: '¿Qué es SIGIC?',
  descripcion:
    'SIGIC es la plataforma digital de la Secretaría de Ciencia y Tecnología, desarrollada en colaboración con CentroGeo para consultar, visualizar y analizar información científica y territorial de México.',
  seccionTexto:
    'Reúne datos abiertos, capas geográficas, documentos y herramientas de inteligencia artificial en un solo lugar, para que investigadores, tomadores de decisiones y público en general puedan explorar el conocimiento generado por el sistema nacional de ciencia y tecnología.',
  logoUrl: null,
  logoSecundarioUrl: null,
  logoTerceroUrl: null,
  logoCuartoUrl: null,
  tarjetas: tarjetasPorDefecto,
  secciones: [],
  bloques: [],
  paginas: [],
  paginaInicioId: null,
  actualizadoEn: new Date(0).toISOString(),
};

export async function getLandingBuilderConfig(): Promise<LandingBuilderConfig> {
  const storage = useStorage('landingBuilder');
  const config = await storage.getItem<LandingBuilderConfig>(CONFIG_KEY);
  return config ? { ...configPorDefecto, ...config } : configPorDefecto;
}

export async function saveLandingBuilderConfig(
  campos: Omit<
    LandingBuilderConfig,
    | 'nombrePlataforma'
    | 'logoUrl'
    | 'logoSecundarioUrl'
    | 'logoTerceroUrl'
    | 'logoCuartoUrl'
    | 'tarjetas'
    | 'actualizadoEn'
  > & {
    nombrePlataforma?: string;
    logoUrl?: string;
    logoSecundarioUrl?: string;
    logoTerceroUrl?: string;
    logoCuartoUrl?: string;
    tarjetas: Array<Omit<LandingBuilderTarjeta, 'imagenUrl'> & { imagenUrl?: string | null }>;
  },
  logo?: LandingBuilderLogo,
  logoSecundario?: LandingBuilderLogo,
  logoTercero?: LandingBuilderLogo,
  logoCuarto?: LandingBuilderLogo,
  imagenesTarjetas?: Record<string, LandingBuilderLogo>
): Promise<LandingBuilderConfig> {
  const storage = useStorage('landingBuilder');
  const actual = await getLandingBuilderConfig();

  if (campos.tarjetas.length > LIMITE_TARJETAS) {
    throw createError({
      statusCode: 400,
      statusMessage: `No se permiten más de ${LIMITE_TARJETAS} tarjetas`,
    });
  }

  let logoUrl = actual.logoUrl;
  if (logo) {
    await storage.setItemRaw(LOGO_KEY, logo.data);
    await storage.setItem(LOGO_META_KEY, { mimetype: logo.mimetype });
    logoUrl = `/api/landing-builder/logo?v=${Date.now()}`;
  } else if (campos.logoUrl !== undefined) {
    logoUrl = campos.logoUrl || null;
  }

  let logoSecundarioUrl = actual.logoSecundarioUrl;
  if (logoSecundario) {
    await storage.setItemRaw(LOGO_SECUNDARIO_KEY, logoSecundario.data);
    await storage.setItem(LOGO_SECUNDARIO_META_KEY, { mimetype: logoSecundario.mimetype });
    logoSecundarioUrl = `/api/landing-builder/logo-secundario?v=${Date.now()}`;
  } else if (campos.logoSecundarioUrl !== undefined) {
    logoSecundarioUrl = campos.logoSecundarioUrl || null;
  }

  let logoTerceroUrl = actual.logoTerceroUrl;
  if (logoTercero) {
    await storage.setItemRaw(LOGO_TERCERO_KEY, logoTercero.data);
    await storage.setItem(LOGO_TERCERO_META_KEY, { mimetype: logoTercero.mimetype });
    logoTerceroUrl = `/api/landing-builder/logo-tercero?v=${Date.now()}`;
  } else if (campos.logoTerceroUrl !== undefined) {
    logoTerceroUrl = campos.logoTerceroUrl || null;
  }

  let logoCuartoUrl = actual.logoCuartoUrl;
  if (logoCuarto) {
    await storage.setItemRaw(LOGO_CUARTO_KEY, logoCuarto.data);
    await storage.setItem(LOGO_CUARTO_META_KEY, { mimetype: logoCuarto.mimetype });
    logoCuartoUrl = `/api/landing-builder/logo-cuarto?v=${Date.now()}`;
  } else if (campos.logoCuartoUrl !== undefined) {
    logoCuartoUrl = campos.logoCuartoUrl || null;
  }

  const idsActuales = new Set(actual.tarjetas.map((tarjeta) => tarjeta.id));
  const idsNuevos = new Set(campos.tarjetas.map((tarjeta) => tarjeta.id));
  await Promise.all(
    [...idsActuales]
      .filter((id) => !idsNuevos.has(id))
      .map((id) =>
        Promise.all([
          storage.removeItem(tarjetaImagenKey(id)),
          storage.removeItem(tarjetaImagenMetaKey(id)),
        ])
      )
  );

  const tarjetas: LandingBuilderTarjeta[] = await Promise.all(
    campos.tarjetas.map(async (tarjeta) => {
      const imagen = imagenesTarjetas?.[tarjeta.id];
      if (imagen) {
        await storage.setItemRaw(tarjetaImagenKey(tarjeta.id), imagen.data);
        await storage.setItem(tarjetaImagenMetaKey(tarjeta.id), { mimetype: imagen.mimetype });
        return {
          ...tarjeta,
          imagenUrl: `/api/landing-builder/tarjeta-imagen/${tarjeta.id}?v=${Date.now()}`,
        };
      }

      return { ...tarjeta, imagenUrl: tarjeta.imagenUrl ?? null };
    })
  );

  const nuevaConfig: LandingBuilderConfig = {
    ...campos,
    nombrePlataforma: campos.nombrePlataforma ?? actual.nombrePlataforma,
    logoUrl,
    logoSecundarioUrl,
    logoTerceroUrl,
    logoCuartoUrl,
    tarjetas,
    paginas: actual.paginas,
    paginaInicioId: actual.paginaInicioId,
    actualizadoEn: new Date().toISOString(),
  };
  await storage.setItem(CONFIG_KEY, nuevaConfig);
  return nuevaConfig;
}

export async function getLandingBuilderLogo(): Promise<LandingBuilderLogo | null> {
  const storage = useStorage('landingBuilder');
  const [data, meta] = await Promise.all([
    storage.getItemRaw<Buffer>(LOGO_KEY),
    storage.getItem<{ mimetype: string }>(LOGO_META_KEY),
  ]);
  if (!data || !meta) return null;
  return { data, mimetype: meta.mimetype };
}

export async function getLandingBuilderLogoSecundario(): Promise<LandingBuilderLogo | null> {
  const storage = useStorage('landingBuilder');
  const [data, meta] = await Promise.all([
    storage.getItemRaw<Buffer>(LOGO_SECUNDARIO_KEY),
    storage.getItem<{ mimetype: string }>(LOGO_SECUNDARIO_META_KEY),
  ]);
  if (!data || !meta) return null;
  return { data, mimetype: meta.mimetype };
}

export async function getLandingBuilderLogoTercero(): Promise<LandingBuilderLogo | null> {
  const storage = useStorage('landingBuilder');
  const [data, meta] = await Promise.all([
    storage.getItemRaw<Buffer>(LOGO_TERCERO_KEY),
    storage.getItem<{ mimetype: string }>(LOGO_TERCERO_META_KEY),
  ]);
  if (!data || !meta) return null;
  return { data, mimetype: meta.mimetype };
}

export async function getLandingBuilderLogoCuarto(): Promise<LandingBuilderLogo | null> {
  const storage = useStorage('landingBuilder');
  const [data, meta] = await Promise.all([
    storage.getItemRaw<Buffer>(LOGO_CUARTO_KEY),
    storage.getItem<{ mimetype: string }>(LOGO_CUARTO_META_KEY),
  ]);
  if (!data || !meta) return null;
  return { data, mimetype: meta.mimetype };
}

export async function getLandingBuilderTarjetaImagen(
  id: string
): Promise<LandingBuilderLogo | null> {
  const storage = useStorage('landingBuilder');
  const [data, meta] = await Promise.all([
    storage.getItemRaw<Buffer>(tarjetaImagenKey(id)),
    storage.getItem<{ mimetype: string }>(tarjetaImagenMetaKey(id)),
  ]);
  if (!data || !meta) return null;
  return { data, mimetype: meta.mimetype };
}

export async function saveLandingBuilderCardImage(
  sectionId: string,
  cardId: string,
  data: Buffer,
  mimetype: string
): Promise<string> {
  const storage = useStorage('landingBuilder');
  await storage.setItemRaw(`secciones:${sectionId}:tarjetas:${cardId}:archivo`, data);
  await storage.setItem(`secciones:${sectionId}:tarjetas:${cardId}:meta.json`, { mimetype });
  return `/api/landing-builder/tarjetas/${sectionId}/${cardId}/imagen?v=${Date.now()}`;
}

export async function getLandingBuilderCardImage(
  sectionId: string,
  cardId: string
): Promise<LandingBuilderLogo | null> {
  const storage = useStorage('landingBuilder');
  const [data, meta] = await Promise.all([
    storage.getItemRaw<Buffer>(`secciones:${sectionId}:tarjetas:${cardId}:archivo`),
    storage.getItem<{ mimetype: string }>(`secciones:${sectionId}:tarjetas:${cardId}:meta.json`),
  ]);
  if (!data || !meta) return null;
  return { data, mimetype: meta.mimetype };
}

const bloqueImagenKey = (bloqueId: string, tipo: string, itemId: string) =>
  `bloque:${bloqueId}:${tipo}:${itemId}:archivo`;
const bloqueImagenMetaKey = (bloqueId: string, tipo: string, itemId: string) =>
  `bloque:${bloqueId}:${tipo}:${itemId}:meta.json`;

export async function saveLandingBuilderBloqueImagen(
  bloqueId: string,
  tipo: string,
  itemId: string,
  data: Buffer,
  mimetype: string
): Promise<string> {
  const storage = useStorage('landingBuilder');
  await storage.setItemRaw(bloqueImagenKey(bloqueId, tipo, itemId), data);
  await storage.setItem(bloqueImagenMetaKey(bloqueId, tipo, itemId), { mimetype });
  return `/api/landing-builder/bloque-imagen/${bloqueId}/${tipo}/${itemId}?v=${Date.now()}`;
}

export async function getLandingBuilderBloqueImagen(
  bloqueId: string,
  tipo: string,
  itemId: string
): Promise<LandingBuilderLogo | null> {
  const storage = useStorage('landingBuilder');
  const [data, meta] = await Promise.all([
    storage.getItemRaw<Buffer>(bloqueImagenKey(bloqueId, tipo, itemId)),
    storage.getItem<{ mimetype: string }>(bloqueImagenMetaKey(bloqueId, tipo, itemId)),
  ]);
  if (!data || !meta) return null;
  return { data, mimetype: meta.mimetype };
}

export const TIPOS_VIDEO_BLOQUE_PERMITIDOS = ['video/mp4', 'video/webm'];
export const TIPOS_MEDIA_BLOQUE_PERMITIDOS = [
  ...TIPOS_LOGO_PAGINA_PERMITIDOS,
  ...TIPOS_VIDEO_BLOQUE_PERMITIDOS,
];
export const TAMANO_MAXIMO_IMAGEN_BLOQUE = 5 * 1024 * 1024; // 5MB
export const TAMANO_MAXIMO_VIDEO_BLOQUE = 15 * 1024 * 1024; // 15MB

// Procesa los campos `bloque_imagen::<bloqueId>::<tipo>::<itemId>` de un
// formulario multipart: sube cada archivo y escribe la URL resultante en el
// bloque correspondiente (portada, texto-imagen, diapositiva de carrusel o
// tarjeta). Se usa tanto al guardar el borrador general como al editar una
// página ya publicada, para que ambos flujos suban imágenes/videos igual.
export async function procesarImagenesDeBloques(
  files: Record<string, any>,
  bloques: any[]
): Promise<any[]> {
  for (const key of Object.keys(files)) {
    if (!key.startsWith('bloque_imagen::')) continue;

    const [, bloqueId, tipoImagen, itemId] = key.split('::');
    const archivoBloque = files[key]?.[0];
    if (!archivoBloque) continue;

    const mimetypeValido = validarYObtenerMimetypeImagen(
      archivoBloque,
      TIPOS_MEDIA_BLOQUE_PERMITIDOS
    );
    if (!mimetypeValido) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El archivo del bloque debe ser PNG, JPEG, WEBP, SVG, MP4 o WEBM',
      });
    }
    const esVideo = TIPOS_VIDEO_BLOQUE_PERMITIDOS.includes(mimetypeValido);
    const limiteBloque = esVideo ? TAMANO_MAXIMO_VIDEO_BLOQUE : TAMANO_MAXIMO_IMAGEN_BLOQUE;
    if (archivoBloque.size > limiteBloque) {
      throw createError({
        statusCode: 400,
        statusMessage: esVideo
          ? 'El video del bloque no debe superar 15MB'
          : 'La imagen del bloque no debe superar 5MB',
      });
    }

    const data = await fsp.readFile(archivoBloque.filepath);
    const url = await saveLandingBuilderBloqueImagen(
      bloqueId,
      tipoImagen,
      itemId,
      data,
      mimetypeValido
    );

    const bloque = bloques.find((b: any) => b.id === bloqueId);

    if (tipoImagen === 'portada') {
      if (bloque?.datos?.fondo) {
        bloque.datos.fondo.url = url;
      }
      continue;
    }

    if (tipoImagen === 'contenido') {
      if (bloque?.datos?.imagen) {
        bloque.datos.imagen.url = url;
      }
      continue;
    }

    const lista =
      tipoImagen === 'diapositiva' ? bloque?.datos?.diapositivas : bloque?.datos?.tarjetas;
    const item = lista?.find((i: any) => i.id === itemId);
    if (item) {
      item.imagenUrl = url;
      item.imagenTipo = esVideo ? 'video' : 'imagen';
    }
  }

  return bloques;
}

const paginaLogoKey = (paginaId: string, slot: string) => `pagina:${paginaId}:logo:${slot}:archivo`;
const paginaLogoMetaKey = (paginaId: string, slot: string) =>
  `pagina:${paginaId}:logo:${slot}:meta.json`;

export async function saveLandingBuilderPaginaLogo(
  paginaId: string,
  slot: string,
  data: Buffer,
  mimetype: string
): Promise<string> {
  const storage = useStorage('landingBuilder');
  await storage.setItemRaw(paginaLogoKey(paginaId, slot), data);
  await storage.setItem(paginaLogoMetaKey(paginaId, slot), { mimetype });
  return `/api/landing-builder/pagina-logo/${paginaId}/${slot}?v=${Date.now()}`;
}

export async function getLandingBuilderPaginaLogo(
  paginaId: string,
  slot: string
): Promise<LandingBuilderLogo | null> {
  const storage = useStorage('landingBuilder');
  const [data, meta] = await Promise.all([
    storage.getItemRaw<Buffer>(paginaLogoKey(paginaId, slot)),
    storage.getItem<{ mimetype: string }>(paginaLogoMetaKey(paginaId, slot)),
  ]);
  if (!data || !meta) return null;
  return { data, mimetype: meta.mimetype };
}

export async function getLandingBuilderPaginas(): Promise<LandingBuilderPagina[]> {
  const config = await getLandingBuilderConfig();
  // Compatibilidad con páginas creadas antes de que existiera la identidad por página.
  return (config.paginas ?? []).map((pagina) => ({
    ...pagina,
    identidad: pagina.identidad ?? IDENTIDAD_PAGINA_VACIA,
  }));
}

export async function getLandingBuilderPaginaPorSlug(
  slug: string
): Promise<LandingBuilderPagina | null> {
  const paginas = await getLandingBuilderPaginas();
  return paginas.find((pagina) => pagina.slug === slug) ?? null;
}

export async function crearLandingBuilderPagina(
  bloques: LandingBuilderBloque[],
  identidad: LandingBuilderPaginaIdentidad = IDENTIDAD_PAGINA_VACIA,
  idPredefinido?: string
): Promise<LandingBuilderPagina[]> {
  const storage = useStorage('landingBuilder');
  const config = await getLandingBuilderConfig();
  const paginas = config.paginas ?? [];

  if (paginas.length >= LIMITE_PAGINAS) {
    throw createError({
      statusCode: 400,
      statusMessage: `No se permiten más de ${LIMITE_PAGINAS} páginas. Elimina una página existente para crear otra.`,
    });
  }

  const numero = paginas.length + 1;
  const nuevaPagina: LandingBuilderPagina = {
    id: idPredefinido ?? `pagina-${Date.now()}`,
    nombre: `Página ${numero}`,
    slug: `pagina-${numero}`,
    bloques,
    identidad,
    creadaEn: new Date().toISOString(),
  };

  const nuevasPaginas = [...paginas, nuevaPagina];
  await storage.setItem(CONFIG_KEY, { ...config, paginas: nuevasPaginas });
  return nuevasPaginas;
}

export async function eliminarLandingBuilderPagina(
  id: string
): Promise<{ paginas: LandingBuilderPagina[]; paginaInicioId: string | null }> {
  const storage = useStorage('landingBuilder');
  const config = await getLandingBuilderConfig();
  const paginas = (config.paginas ?? []).filter((pagina) => pagina.id !== id);
  const paginaInicioId = config.paginaInicioId === id ? null : (config.paginaInicioId ?? null);

  await storage.setItem(CONFIG_KEY, { ...config, paginas, paginaInicioId });
  return { paginas, paginaInicioId };
}

export async function getLandingBuilderPaginaInicio(): Promise<LandingBuilderPagina | null> {
  const config = await getLandingBuilderConfig();
  if (!config.paginaInicioId) return null;

  const paginas = await getLandingBuilderPaginas();
  return paginas.find((pagina) => pagina.id === config.paginaInicioId) ?? null;
}

export async function setLandingBuilderPaginaInicio(
  id: string | null
): Promise<{ paginaInicioId: string | null }> {
  const storage = useStorage('landingBuilder');
  const config = await getLandingBuilderConfig();

  if (id !== null) {
    const paginas = await getLandingBuilderPaginas();
    if (!paginas.some((pagina) => pagina.id === id)) {
      throw createError({ statusCode: 400, statusMessage: 'La página seleccionada no existe' });
    }
  }

  await storage.setItem(CONFIG_KEY, { ...config, paginaInicioId: id });
  return { paginaInicioId: id };
}

function slugify(texto: string): string {
  const base = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'pagina';
}

function generarSlugUnico(
  nombre: string,
  paginas: LandingBuilderPagina[],
  idExcluir?: string
): string {
  const base = slugify(nombre);
  let slug = base;
  let contador = 2;
  while (paginas.some((pagina) => pagina.slug === slug && pagina.id !== idExcluir)) {
    slug = `${base}-${contador}`;
    contador += 1;
  }
  return slug;
}

export async function renombrarLandingBuilderPagina(
  id: string,
  nombre: string
): Promise<LandingBuilderPagina[]> {
  const storage = useStorage('landingBuilder');
  const config = await getLandingBuilderConfig();
  const paginas = config.paginas ?? [];
  const pagina = paginas.find((item) => item.id === id);

  if (!pagina) {
    throw createError({ statusCode: 404, statusMessage: 'Página no encontrada' });
  }

  pagina.nombre = nombre;
  pagina.slug = generarSlugUnico(nombre, paginas, id);
  await storage.setItem(CONFIG_KEY, { ...config, paginas });
  return paginas;
}

export async function actualizarLandingBuilderPagina(
  id: string,
  bloques: LandingBuilderBloque[],
  identidad?: LandingBuilderPaginaIdentidad
): Promise<LandingBuilderPagina[]> {
  const storage = useStorage('landingBuilder');
  const config = await getLandingBuilderConfig();
  const paginas = config.paginas ?? [];
  const pagina = paginas.find((item) => item.id === id);

  if (!pagina) {
    throw createError({ statusCode: 404, statusMessage: 'Página no encontrada' });
  }

  pagina.bloques = bloques;
  if (identidad) {
    pagina.identidad = identidad;
  }
  await storage.setItem(CONFIG_KEY, { ...config, paginas });
  return paginas;
}
