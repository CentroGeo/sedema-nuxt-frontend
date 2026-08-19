import { defineStore } from 'pinia';

// Deriva un identifier tipo camelCase (sin acentos/espacios) a partir del
// nombre capturado en el formulario, para no pedirle ese dato técnico al
// usuario. Debe ser único en GeoNode (TopicCategory.identifier); si choca,
// el backend responde con un error que se refleja en `error`.
const ACENTOS = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };

function quitarAcentos(texto) {
  return texto
    .toLowerCase()
    .split('')
    .map((letra) => ACENTOS[letra] ?? letra)
    .join('');
}

function generarIdentifier(nombre) {
  const base = quitarAcentos(nombre || '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra, indice) =>
      indice === 0
        ? palabra.charAt(0).toLowerCase() + palabra.slice(1)
        : palabra.charAt(0).toUpperCase() + palabra.slice(1)
    )
    .join('');
  return base || `categoria${Date.now()}`;
}

function extraerMensajeError(err) {
  if (err?.message) return err.message;
  if (typeof err === 'string') return err;
  return 'Ocurrió un error inesperado.';
}

// Si la API responde 200 con un cuerpo de error de DRF (en vez de lanzar),
// esto lo detecta para que el store lo refleje como error.
function respuestaEsError(respuesta) {
  if (!respuesta || typeof respuesta !== 'object') return false;
  return Boolean(respuesta.detail || respuesta.non_field_errors || Array.isArray(respuesta));
}

function mensajeDeRespuestaError(respuesta) {
  if (respuesta.detail) return respuesta.detail;
  if (respuesta.non_field_errors) return respuesta.non_field_errors.join(' ');
  const primerCampo = Object.keys(respuesta)[0];
  if (primerCampo) {
    const valor = respuesta[primerCampo];
    return Array.isArray(valor) ? valor.join(' ') : String(valor);
  }
  return 'La solicitud no pudo completarse.';
}

export const useCategoriasStore = defineStore('categorias', () => {
  const api = useCategoriasApi();
  const { data } = useAuth();
  const token = () => data.value?.accessToken;

  const conjuntos = ref([]);
  const cargando = ref(false);
  const error = ref(null);

  const conjuntoActivo = computed(
    () => conjuntos.value.find((conjunto) => conjunto.activo) ?? null
  );
  const idConjuntoActivo = computed(() => conjuntoActivo.value?.id ?? null);

  function categoriasPublicadas(conjunto) {
    return (conjunto?.categorias ?? []).filter((categoria) => categoria.estado === 'Publicada');
  }

  // Lo que realmente alimenta el catálogo y el formulario de metadatos de
  // la instancia: solo las categorías publicadas del conjunto activo.
  const categoriasVisiblesInstancia = computed(() =>
    conjuntoActivo.value ? categoriasPublicadas(conjuntoActivo.value) : []
  );

  function claseEstado(estado) {
    return estado === 'Publicada'
      ? 'texto-color-confirmacion fondo-color-confirmacion borde borde-color-confirmacion'
      : 'texto-color-neutro fondo-color-neutro borde borde-color-neutro';
  }

  function mapearCategoria(categoria) {
    return {
      id: categoria.id,
      nombre: categoria.nombre,
      identifier: categoria.identifier,
      tipo: categoria.tipo,
      estado: categoria.estado,
    };
  }

  function mapearConjunto(conjunto) {
    return {
      id: conjunto.id,
      nombre: conjunto.nombre,
      descripcion: conjunto.descripcion,
      protegido: conjunto.protegido,
      activo: conjunto.activo,
      categorias: (conjunto.categorias ?? []).map(mapearCategoria),
    };
  }

  async function cargarConjuntos() {
    cargando.value = true;
    error.value = null;
    try {
      const listado = await api.fetchConjuntos();
      const detalles = await Promise.all(
        (listado.results ?? []).map((item) => api.fetchConjunto(item.id))
      );
      conjuntos.value = detalles.map(mapearConjunto);
    } catch (err) {
      error.value = extraerMensajeError(err);
    } finally {
      cargando.value = false;
    }
  }

  // --- CRUD de conjuntos ---

  async function activarConjunto(id) {
    error.value = null;
    try {
      const respuesta = await api.activarConjunto(id, token());
      if (respuestaEsError(respuesta)) throw new Error(mensajeDeRespuestaError(respuesta));
      await cargarConjuntos();
    } catch (err) {
      error.value = extraerMensajeError(err);
    }
  }

  async function crearConjunto({ nombre, descripcion }) {
    error.value = null;
    try {
      const respuesta = await api.crearConjunto(
        { nombre: nombre.trim(), descripcion: descripcion.trim() },
        token()
      );
      if (respuestaEsError(respuesta)) throw new Error(mensajeDeRespuestaError(respuesta));
      await cargarConjuntos();
    } catch (err) {
      error.value = extraerMensajeError(err);
    }
  }

  async function actualizarConjunto(id, { nombre, descripcion }) {
    error.value = null;
    try {
      const respuesta = await api.actualizarConjunto(
        id,
        { nombre: nombre.trim(), descripcion: descripcion.trim() },
        token()
      );
      if (respuestaEsError(respuesta)) throw new Error(mensajeDeRespuestaError(respuesta));
      await cargarConjuntos();
    } catch (err) {
      error.value = extraerMensajeError(err);
    }
  }

  async function eliminarConjunto(id) {
    error.value = null;
    try {
      const ok = await api.eliminarConjunto(id, token());
      if (ok) await cargarConjuntos();
      return ok;
    } catch (err) {
      error.value = extraerMensajeError(err);
      return false;
    }
  }

  // --- CRUD de categorías dentro de un conjunto ---

  async function crearCategoria(conjuntoId, { nombre, tipo, estado }) {
    error.value = null;
    try {
      const respuesta = await api.crearCategoria(
        {
          conjunto: conjuntoId,
          tipo: tipo.trim(),
          estado,
          nueva_categoria: {
            identifier: generarIdentifier(nombre),
            gn_description: nombre.trim(),
          },
        },
        token()
      );
      if (respuestaEsError(respuesta)) throw new Error(mensajeDeRespuestaError(respuesta));
      await cargarConjuntos();
    } catch (err) {
      error.value = extraerMensajeError(err);
    }
  }

  async function actualizarCategoria(conjuntoId, categoriaId, { nombre, tipo, estado }) {
    error.value = null;
    try {
      const respuesta = await api.actualizarCategoria(
        categoriaId,
        { tipo: tipo.trim(), estado, gn_description: nombre.trim() },
        token()
      );
      if (respuestaEsError(respuesta)) throw new Error(mensajeDeRespuestaError(respuesta));
      await cargarConjuntos();
    } catch (err) {
      error.value = extraerMensajeError(err);
    }
  }

  async function eliminarCategoria(conjuntoId, categoriaId) {
    error.value = null;
    try {
      await api.eliminarCategoria(categoriaId, token());
      await cargarConjuntos();
    } catch (err) {
      error.value = extraerMensajeError(err);
    }
  }

  return {
    conjuntos,
    cargando,
    error,
    idConjuntoActivo,
    conjuntoActivo,
    categoriasPublicadas,
    categoriasVisiblesInstancia,
    claseEstado,
    cargarConjuntos,
    activarConjunto,
    crearConjunto,
    actualizarConjunto,
    eliminarConjunto,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
  };
});
