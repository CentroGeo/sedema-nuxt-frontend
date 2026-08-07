import { defineStore } from 'pinia';

export const LIMITE_TARJETAS = 10;
export const LIMITE_PAGINAS = 3;

function crearTarjetaVacia() {
  return {
    id: crypto.randomUUID(),
    titulo: '',
    descripcion: '',
    textoBoton: '',
    enlaceBoton: '',
    imagenUrl: null,
  };
}

// Si el logo viene de un archivo pendiente lo usa tal cual; si ya pertenece a
// esta misma página no hace falta reenviarlo; en cualquier otro caso (borrador
// global u otra página) se descarga y se reenvía como archivo nuevo para que
// cada página guarde su propia copia independiente y no comparta almacenamiento.
async function resolverLogoParaEnvio(url, archivoPendiente, slot, paginaId) {
  if (archivoPendiente) return archivoPendiente;
  if (!url || url.startsWith('blob:')) return null;

  const esUrlExterna =
    url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');

  const esOrigenLocal = typeof window !== 'undefined' && url.startsWith(window.location.origin);

  if (esUrlExterna && !esOrigenLocal) {
    return null;
  }

  if (paginaId && url.includes(`/pagina-logo/${paginaId}/${slot}`)) return null;

  try {
    let requestUrl = url;
    if (url.startsWith('/api/') && typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/admin')) {
        requestUrl = '/admin' + url;
      } else if (window.location.pathname.startsWith('/app')) {
        requestUrl = '/app' + url;
      }
    }
    const respuesta = await fetch(requestUrl);
    if (!respuesta.ok) return null;
    const blob = await respuesta.blob();
    return new File([blob], `${slot}.png`, { type: blob.type || 'image/png' });
  } catch (err) {
    console.error(err);
    return null;
  }
}

// El guardado de configuración general (/api/landing-builder/config) devuelve el
// logo del borrador global. Si el valor actual ya es un logo propio de una página
// (pagina-logo/...) que esta vez no se tocó, hay que conservarlo: si no, el guardado
// general lo pisaría con el (posiblemente distinto o vacío) valor global.
function sincronizarLogoDesdeConfig(valorActual, valorConfig) {
  if (valorActual && valorActual.startsWith('/api/landing-builder/pagina-logo/')) {
    return valorActual;
  }
  return valorConfig ?? null;
}

// Limpia los bloques antes de enviarlos al servidor: quita el `archivo`/
// `imagenFile` temporal (el archivo en sí se manda aparte, ver
// `adjuntarImagenesDeBloques`) y descarta cualquier URL `blob:` que haya
// quedado sin subir (solo válida en la sesión del navegador que la creó).
function serializarBloquesParaEnvio(bloques) {
  return bloques.map((bloque) => {
    if (bloque.tipo === 'portada') {
      // eslint-disable-next-line no-unused-vars
      const { archivo, ...fondo } = bloque.datos.fondo || {};
      return {
        ...bloque,
        datos: {
          ...bloque.datos,
          fondo: {
            ...fondo,
            url: fondo.url && !fondo.url.startsWith('blob:') ? fondo.url : null,
          },
        },
      };
    }

    if (bloque.tipo === 'carrusel') {
      return {
        ...bloque,
        datos: {
          ...bloque.datos,
          diapositivas: (bloque.datos.diapositivas || []).map(
            ({ id, texto, imagenUrl, imagenTipo, botonTexto, botonUrl }) => ({
              id,
              texto,
              imagenUrl: imagenUrl && !imagenUrl.startsWith('blob:') ? imagenUrl : null,
              imagenTipo: imagenTipo || 'imagen',
              botonTexto: botonTexto || '',
              botonUrl: botonUrl || '',
            })
          ),
        },
      };
    }

    if (bloque.tipo === 'tarjetas') {
      return {
        ...bloque,
        datos: {
          ...bloque.datos,
          // eslint-disable-next-line no-unused-vars
          tarjetas: (bloque.datos.tarjetas || []).map(({ imagenFile, ...tarjeta }) => ({
            ...tarjeta,
            imagenUrl:
              tarjeta.imagenUrl && !tarjeta.imagenUrl.startsWith('blob:')
                ? tarjeta.imagenUrl
                : null,
          })),
        },
      };
    }

    if (bloque.tipo === 'texto-imagen') {
      // eslint-disable-next-line no-unused-vars
      const { archivo, ...imagen } = bloque.datos.imagen || {};
      return {
        ...bloque,
        datos: {
          ...bloque.datos,
          imagen: {
            ...imagen,
            url: imagen.url && !imagen.url.startsWith('blob:') ? imagen.url : null,
          },
        },
      };
    }

    return bloque;
  });
}

// Adjunta al FormData los archivos reales (imagen o video) de cada bloque
// que tenga uno pendiente de subir, con el mismo nombre de campo
// `bloque_imagen::<bloqueId>::<tipo>::<itemId>` que el servidor espera.
function adjuntarImagenesDeBloques(formData, bloques) {
  bloques.forEach((bloque) => {
    if (bloque.tipo === 'portada' && bloque.datos.fondo?.archivo) {
      formData.append(`bloque_imagen::${bloque.id}::portada::fondo`, bloque.datos.fondo.archivo);
    }

    if (bloque.tipo === 'texto-imagen' && bloque.datos.imagen?.archivo) {
      formData.append(
        `bloque_imagen::${bloque.id}::contenido::imagen`,
        bloque.datos.imagen.archivo
      );
    }

    if (bloque.tipo === 'carrusel') {
      (bloque.datos.diapositivas || []).forEach((d) => {
        if (d.imagenArchivo) {
          formData.append(`bloque_imagen::${bloque.id}::diapositiva::${d.id}`, d.imagenArchivo);
        }
      });
    }

    if (bloque.tipo === 'tarjetas') {
      (bloque.datos.tarjetas || []).forEach((t) => {
        if (t.imagenFile) {
          formData.append(`bloque_imagen::${bloque.id}::tarjeta::${t.id}`, t.imagenFile);
        }
      });
    }
  });
}

async function construirFormDataPagina(store, paginaId) {
  const formData = new FormData();
  formData.append('bloques', JSON.stringify(serializarBloquesParaEnvio(store.bloques)));
  adjuntarImagenesDeBloques(formData, store.bloques);

  const identidad = {
    nombrePlataforma: store.nombrePlataforma || '',
    logoUrl: store.logoUrl && !store.logoUrl.startsWith('blob:') ? store.logoUrl : null,
    logoSecundarioUrl:
      store.logoSecundarioUrl && !store.logoSecundarioUrl.startsWith('blob:')
        ? store.logoSecundarioUrl
        : null,
    logoTerceroUrl:
      store.logoTerceroUrl && !store.logoTerceroUrl.startsWith('blob:')
        ? store.logoTerceroUrl
        : null,
    logoCuartoUrl:
      store.logoCuartoUrl && !store.logoCuartoUrl.startsWith('blob:') ? store.logoCuartoUrl : null,
    logoRedirectUrl: store.logoRedirectUrl || null,
    logoSecundarioRedirectUrl: store.logoSecundarioRedirectUrl || null,
    logoTerceroRedirectUrl: store.logoTerceroRedirectUrl || null,
    logoCuartoRedirectUrl: store.logoCuartoRedirectUrl || null,
    mostrarBarraGobMx: store.mostrarBarraGobMx !== false,
  };
  formData.append('identidad', JSON.stringify(identidad));

  const slots = [
    { slot: 'logo1', url: store.logoUrl, archivo: store.logoFile },
    { slot: 'logo2', url: store.logoSecundarioUrl, archivo: store.logoSecundarioFile },
    { slot: 'logo3', url: store.logoTerceroUrl, archivo: store.logoTerceroFile },
    { slot: 'logo4', url: store.logoCuartoUrl, archivo: store.logoCuartoFile },
  ];

  for (const { slot, url, archivo } of slots) {
    const archivoParaEnviar = await resolverLogoParaEnvio(url, archivo, slot, paginaId);
    if (archivoParaEnviar) {
      formData.append(slot, archivoParaEnviar);
    }
  }

  return formData;
}

function sincronizarIdentidadPublicada(store, paginas, paginaId) {
  const pagina = paginaId ? paginas.find((p) => p.id === paginaId) : paginas[paginas.length - 1];
  if (!pagina?.identidad) return;

  store.nombrePlataforma = pagina.identidad.nombrePlataforma || '';
  store.logoUrl = pagina.identidad.logoUrl;
  store.logoSecundarioUrl = pagina.identidad.logoSecundarioUrl;
  store.logoTerceroUrl = pagina.identidad.logoTerceroUrl;
  store.logoCuartoUrl = pagina.identidad.logoCuartoUrl;
  store.logoRedirectUrl = pagina.identidad.logoRedirectUrl || null;
  store.logoSecundarioRedirectUrl = pagina.identidad.logoSecundarioRedirectUrl || null;
  store.logoTerceroRedirectUrl = pagina.identidad.logoTerceroRedirectUrl || null;
  store.logoCuartoRedirectUrl = pagina.identidad.logoCuartoRedirectUrl || null;
  store.mostrarBarraGobMx = pagina.identidad.mostrarBarraGobMx !== false;
  store.logoFile = null;
  store.logoSecundarioFile = null;
  store.logoTerceroFile = null;
  store.logoCuartoFile = null;
}

export const useLandingBuilderStore = defineStore('landingBuilder', () => {
  return {
    limitePaginas: LIMITE_PAGINAS,
    nombrePlataforma: ref(''),
    titulo: ref(''),
    subtitulo: ref(''),
    tituloSeccion: ref(''),
    descripcion: ref(''),
    seccionTexto: ref(''),
    logoUrl: ref(null),
    logoFile: ref(null),
    logoSecundarioUrl: ref(null),
    logoSecundarioFile: ref(null),
    logoTerceroUrl: ref(null),
    logoTerceroFile: ref(null),
    logoCuartoUrl: ref(null),
    logoCuartoFile: ref(null),
    logoRedirectUrl: ref(null),
    logoSecundarioRedirectUrl: ref(null),
    logoTerceroRedirectUrl: ref(null),
    logoCuartoRedirectUrl: ref(null),
    mostrarBarraGobMx: ref(true),
    // Identidad de la página pública (o de inicio) que se está visitando
    // actualmente; el layout la usa para decidir si muestra la barra de
    // Gobierno de México en páginas ajenas al constructor.
    mostrarBarraGobMxPublica: ref(true),
    tarjetas: ref([]),
    tarjetaImagenFiles: ref({}),
    secciones: ref([]),
    bloques: ref([]),
    // Última copia de bloques que se guardó (borrador o página); sirve para
    // saber si hay cambios sin guardar antes de descartar el lienzo.
    ultimoGuardadoBloques: ref('[]'),
    paginas: ref([]),
    paginaInicioId: ref(null),
    paginaEditandoId: ref(null),
    isPublicando: ref(false),
    isCreandoPagina: ref(false),
    isLoading: ref(false),
    isSaving: ref(false),
    error: ref(null),
    saveSuccess: ref(false),
    mensajeExito: ref(''),

    async cargarConfiguracion() {
      this.isLoading = true;
      this.error = null;
      try {
        const config = await $fetch('/api/landing-builder/config');
        this.nombrePlataforma = config.nombrePlataforma;
        this.titulo = config.titulo;
        this.subtitulo = config.subtitulo;
        this.tituloSeccion = config.tituloSeccion;
        this.descripcion = config.descripcion;
        this.seccionTexto = config.seccionTexto;
        this.logoUrl = config.logoUrl;
        this.logoSecundarioUrl = config.logoSecundarioUrl;
        this.logoTerceroUrl = config.logoTerceroUrl || null;
        this.logoCuartoUrl = config.logoCuartoUrl || null;
        this.logoRedirectUrl = config.logoRedirectUrl || null;
        this.logoSecundarioRedirectUrl = config.logoSecundarioRedirectUrl || null;
        this.logoTerceroRedirectUrl = config.logoTerceroRedirectUrl || null;
        this.logoCuartoRedirectUrl = config.logoCuartoRedirectUrl || null;
        this.tarjetas = config.tarjetas ?? [];
        this.tarjetaImagenFiles = {};
        this.secciones = config.secciones || [];
        this.bloques = config.bloques || [];
        this.paginas = config.paginas || [];
        this.paginaInicioId = config.paginaInicioId ?? null;
        this.marcarBloquesComoGuardados();
      } catch (err) {
        console.error('Error al cargar la configuración de la landing page:', err);
        this.error = 'No se pudo cargar la configuración. Intenta de nuevo.';
      } finally {
        this.isLoading = false;
      }
    },

    async cargarPaginas() {
      try {
        this.paginas = await $fetch('/api/landing-builder/paginas');
      } catch (err) {
        console.error('Error al cargar las páginas publicadas:', err);
      }
    },

    puedeCrearPagina() {
      return this.paginas.length < LIMITE_PAGINAS;
    },

    async publicarPagina() {
      if (!this.puedeCrearPagina()) {
        this.error = `Ya tienes el máximo de ${LIMITE_PAGINAS} páginas. Elimina una para crear otra.`;
        return;
      }

      try {
        const formData = await construirFormDataPagina(this, null);
        this.paginas = await $fetch('/api/landing-builder/paginas', {
          method: 'POST',
          body: formData,
        });
        sincronizarIdentidadPublicada(this, this.paginas, null);
      } catch (err) {
        console.error('Error al publicar la página:', err);
        this.error = err?.data?.statusMessage || 'No se pudo crear la página. Intenta de nuevo.';
      }
    },

    async actualizarPaginaExistente() {
      try {
        const formData = await construirFormDataPagina(this, this.paginaEditandoId);
        this.paginas = await $fetch(`/api/landing-builder/paginas/${this.paginaEditandoId}`, {
          method: 'PATCH',
          body: formData,
        });
        sincronizarIdentidadPublicada(this, this.paginas, this.paginaEditandoId);
      } catch (err) {
        console.error('Error al actualizar la página:', err);
        this.error =
          err?.data?.statusMessage || 'No se pudo actualizar la página. Intenta de nuevo.';
      }
    },

    async crearPagina() {
      const editandoExistente = Boolean(this.paginaEditandoId);

      if (!editandoExistente && !this.puedeCrearPagina()) {
        this.error = `Ya tienes el máximo de ${LIMITE_PAGINAS} páginas. Elimina una para crear otra.`;
        return;
      }

      this.isCreandoPagina = true;
      if (!editandoExistente) {
        await this.guardarConfiguracion();
      }

      if (!this.error) {
        this.isPublicando = true;
        if (editandoExistente) {
          await this.actualizarPaginaExistente();
        } else {
          await this.publicarPagina();
          if (!this.error) {
            this.cancelarEdicionPagina();
          }
        }
        this.isPublicando = false;

        if (!this.error) {
          this.saveSuccess = true;
          this.mensajeExito = editandoExistente
            ? 'Los cambios de la página se guardaron correctamente.'
            : 'Configuración guardada y página publicada.';
          this.marcarBloquesComoGuardados();
        }
      }

      this.isCreandoPagina = false;
    },

    marcarBloquesComoGuardados() {
      this.ultimoGuardadoBloques = JSON.stringify(this.bloques);
    },

    hayCambiosSinGuardar() {
      return JSON.stringify(this.bloques) !== this.ultimoGuardadoBloques;
    },

    cargarPaginaParaEditar(pagina) {
      this.bloques = JSON.parse(JSON.stringify(pagina.bloques));
      this.paginaEditandoId = pagina.id;
      this.error = null;
      this.saveSuccess = false;
      this.marcarBloquesComoGuardados();

      const identidad = pagina.identidad || {};
      this.nombrePlataforma = identidad.nombrePlataforma || '';
      this.logoUrl = identidad.logoUrl || null;
      this.logoSecundarioUrl = identidad.logoSecundarioUrl || null;
      this.logoTerceroUrl = identidad.logoTerceroUrl || null;
      this.logoCuartoUrl = identidad.logoCuartoUrl || null;
      this.logoRedirectUrl = identidad.logoRedirectUrl || null;
      this.logoSecundarioRedirectUrl = identidad.logoSecundarioRedirectUrl || null;
      this.logoTerceroRedirectUrl = identidad.logoTerceroRedirectUrl || null;
      this.logoCuartoRedirectUrl = identidad.logoCuartoRedirectUrl || null;
      this.mostrarBarraGobMx = identidad.mostrarBarraGobMx !== false;
      this.logoFile = null;
      this.logoSecundarioFile = null;
      this.logoTerceroFile = null;
      this.logoCuartoFile = null;
    },

    cancelarEdicionPagina() {
      this.paginaEditandoId = null;
      this.bloques = [];
      this.marcarBloquesComoGuardados();
      this.nombrePlataforma = '';
      this.logoUrl = null;
      this.logoSecundarioUrl = null;
      this.logoTerceroUrl = null;
      this.logoCuartoUrl = null;
      this.logoRedirectUrl = null;
      this.logoSecundarioRedirectUrl = null;
      this.logoTerceroRedirectUrl = null;
      this.logoCuartoRedirectUrl = null;
      this.mostrarBarraGobMx = true;
      this.logoFile = null;
      this.logoSecundarioFile = null;
      this.logoTerceroFile = null;
      this.logoCuartoFile = null;
    },

    async eliminarPagina(id) {
      try {
        const respuesta = await $fetch(`/api/landing-builder/paginas/${id}`, {
          method: 'DELETE',
        });
        this.paginas = respuesta.paginas;
        this.paginaInicioId = respuesta.paginaInicioId;
        if (this.paginaEditandoId === id || this.paginas.length === 0) {
          this.cancelarEdicionPagina();
        }
      } catch (err) {
        console.error('Error al eliminar la página:', err);
        this.error = 'No se pudo eliminar la página. Intenta de nuevo.';
      }
    },

    async establecerPaginaInicio(id) {
      this.error = null;
      this.saveSuccess = false;
      try {
        const respuesta = await $fetch('/api/landing-builder/pagina-inicio', {
          method: 'POST',
          body: { paginaInicioId: id },
        });
        this.paginaInicioId = respuesta.paginaInicioId;
        this.saveSuccess = true;
        this.mensajeExito = 'Página de inicio actualizada.';
      } catch (err) {
        console.error('Error al establecer la página de inicio:', err);
        this.error =
          err?.data?.statusMessage ||
          'No se pudo actualizar la página de inicio. Intenta de nuevo.';
      }
    },

    async renombrarPagina(id, nombre) {
      const nombreLimpio = nombre.trim();
      if (!nombreLimpio) return;

      try {
        this.paginas = await $fetch(`/api/landing-builder/paginas/${id}`, {
          method: 'PATCH',
          body: { nombre: nombreLimpio },
        });
      } catch (err) {
        console.error('Error al renombrar la página:', err);
        this.error = 'No se pudo renombrar la página. Intenta de nuevo.';
      }
    },

    puedeAgregarTarjeta() {
      return this.tarjetas.length < LIMITE_TARJETAS;
    },

    agregarTarjeta() {
      if (!this.puedeAgregarTarjeta()) return null;
      const tarjeta = crearTarjetaVacia();
      this.tarjetas.push(tarjeta);
      return tarjeta;
    },

    eliminarTarjeta(id) {
      const tarjeta = this.tarjetas.find((t) => t.id === id);
      if (tarjeta?.imagenUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(tarjeta.imagenUrl);
      }
      this.tarjetas = this.tarjetas.filter((t) => t.id !== id);
      const archivos = { ...this.tarjetaImagenFiles };
      delete archivos[id];
      this.tarjetaImagenFiles = archivos;
    },

    actualizarTarjeta(id, campos) {
      const tarjeta = this.tarjetas.find((t) => t.id === id);
      if (!tarjeta) return;
      Object.assign(tarjeta, campos);
    },

    setImagenTarjeta(id, archivo) {
      const tarjeta = this.tarjetas.find((t) => t.id === id);
      if (!tarjeta) return;

      if (tarjeta.imagenUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(tarjeta.imagenUrl);
      }

      this.tarjetaImagenFiles = { ...this.tarjetaImagenFiles, [id]: archivo };
      tarjeta.imagenUrl = URL.createObjectURL(archivo);
    },

    reordenarTarjetas(idOrigen, idDestino) {
      if (idOrigen === idDestino) return;

      const indiceOrigen = this.tarjetas.findIndex((t) => t.id === idOrigen);
      const indiceDestino = this.tarjetas.findIndex((t) => t.id === idDestino);
      if (indiceOrigen === -1 || indiceDestino === -1) return;

      const tarjetas = [...this.tarjetas];
      const [tarjetaMovida] = tarjetas.splice(indiceOrigen, 1);
      tarjetas.splice(indiceDestino, 0, tarjetaMovida);
      this.tarjetas = tarjetas;
    },

    setLogoFile(archivo) {
      this.logoFile = archivo;
      if (this.logoUrl && this.logoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.logoUrl);
      }
      this.logoUrl = URL.createObjectURL(archivo);
    },

    setLogoUrl(url) {
      if (this.logoUrl && this.logoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.logoUrl);
      }
      this.logoUrl = url;
      this.logoFile = null;
    },

    setLogoSecundarioFile(archivo) {
      this.logoSecundarioFile = archivo;
      if (this.logoSecundarioUrl && this.logoSecundarioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.logoSecundarioUrl);
      }
      this.logoSecundarioUrl = URL.createObjectURL(archivo);
    },

    setLogoSecundarioUrl(url) {
      if (this.logoSecundarioUrl && this.logoSecundarioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.logoSecundarioUrl);
      }
      this.logoSecundarioUrl = url;
      this.logoSecundarioFile = null;
    },

    setLogoTerceroFile(archivo) {
      this.logoTerceroFile = archivo;
      if (this.logoTerceroUrl && this.logoTerceroUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.logoTerceroUrl);
      }
      this.logoTerceroUrl = URL.createObjectURL(archivo);
    },

    setLogoTerceroUrl(url) {
      if (this.logoTerceroUrl && this.logoTerceroUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.logoTerceroUrl);
      }
      this.logoTerceroUrl = url;
      this.logoTerceroFile = null;
    },

    setLogoCuartoFile(archivo) {
      this.logoCuartoFile = archivo;
      if (this.logoCuartoUrl && this.logoCuartoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.logoCuartoUrl);
      }
      this.logoCuartoUrl = URL.createObjectURL(archivo);
    },

    setLogoCuartoUrl(url) {
      if (this.logoCuartoUrl && this.logoCuartoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.logoCuartoUrl);
      }
      this.logoCuartoUrl = url;
      this.logoCuartoFile = null;
    },

    eliminarLogo() {
      if (this.logoUrl && this.logoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.logoUrl);
      }
      this.logoUrl = null;
      this.logoFile = null;
      this.logoRedirectUrl = null;
    },

    eliminarLogoSecundario() {
      if (this.logoSecundarioUrl && this.logoSecundarioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.logoSecundarioUrl);
      }
      this.logoSecundarioUrl = null;
      this.logoSecundarioFile = null;
      this.logoSecundarioRedirectUrl = null;
    },

    eliminarLogoTercero() {
      if (this.logoTerceroUrl && this.logoTerceroUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.logoTerceroUrl);
      }
      this.logoTerceroUrl = null;
      this.logoTerceroFile = null;
      this.logoTerceroRedirectUrl = null;
    },

    eliminarLogoCuarto() {
      if (this.logoCuartoUrl && this.logoCuartoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.logoCuartoUrl);
      }
      this.logoCuartoUrl = null;
      this.logoCuartoFile = null;
      this.logoCuartoRedirectUrl = null;
    },

    async guardarConfiguracion() {
      this.isSaving = true;
      this.error = null;
      this.saveSuccess = false;
      try {
        const formData = new FormData();
        formData.append('nombrePlataforma', this.nombrePlataforma);
        formData.append('titulo', this.titulo);
        formData.append('subtitulo', this.subtitulo);
        formData.append('tituloSeccion', this.tituloSeccion);
        formData.append('descripcion', this.descripcion);
        formData.append('seccionTexto', this.seccionTexto);
        formData.append('logoRedirectUrl', this.logoRedirectUrl || '');
        formData.append('logoSecundarioRedirectUrl', this.logoSecundarioRedirectUrl || '');
        formData.append('logoTerceroRedirectUrl', this.logoTerceroRedirectUrl || '');
        formData.append('logoCuartoRedirectUrl', this.logoCuartoRedirectUrl || '');

        if (this.logoFile) {
          formData.append('logo', this.logoFile);
        } else if (
          this.logoUrl &&
          !this.logoUrl.startsWith('blob:') &&
          !this.logoUrl.startsWith('/api/')
        ) {
          formData.append('logoUrl', this.logoUrl);
        } else if (!this.logoUrl) {
          formData.append('logoUrl', '');
        }

        if (this.logoSecundarioFile) {
          formData.append('logoSecundario', this.logoSecundarioFile);
        } else if (
          this.logoSecundarioUrl &&
          !this.logoSecundarioUrl.startsWith('blob:') &&
          !this.logoSecundarioUrl.startsWith('/api/')
        ) {
          formData.append('logoSecundarioUrl', this.logoSecundarioUrl);
        } else if (!this.logoSecundarioUrl) {
          formData.append('logoSecundarioUrl', '');
        }

        if (this.logoTerceroFile) {
          formData.append('logoTercero', this.logoTerceroFile);
        } else if (
          this.logoTerceroUrl &&
          !this.logoTerceroUrl.startsWith('blob:') &&
          !this.logoTerceroUrl.startsWith('/api/')
        ) {
          formData.append('logoTerceroUrl', this.logoTerceroUrl);
        } else if (!this.logoTerceroUrl) {
          formData.append('logoTerceroUrl', '');
        }

        if (this.logoCuartoFile) {
          formData.append('logoCuarto', this.logoCuartoFile);
        } else if (
          this.logoCuartoUrl &&
          !this.logoCuartoUrl.startsWith('blob:') &&
          !this.logoCuartoUrl.startsWith('/api/')
        ) {
          formData.append('logoCuartoUrl', this.logoCuartoUrl);
        } else if (!this.logoCuartoUrl) {
          formData.append('logoCuartoUrl', '');
        }

        formData.append(
          'tarjetas',
          JSON.stringify(
            this.tarjetas.map(
              ({ id, titulo, descripcion, textoBoton, enlaceBoton, imagenUrl }) => ({
                id,
                titulo,
                descripcion,
                textoBoton,
                enlaceBoton,
                imagenUrl,
              })
            )
          )
        );

        for (const [id, archivo] of Object.entries(this.tarjetaImagenFiles)) {
          formData.append(`tarjetaImagen_${id}`, archivo);
        }

        const seccionesMetadata = this.secciones.map((sec) => {
          if (sec.tipo === 'tarjetas' && sec.datos.tarjetas) {
            return {
              id: sec.id,
              tipo: sec.tipo,
              datos: {
                ...sec.datos,
                disposicion: sec.datos.disposicion || 'vertical',
                tarjetas: sec.datos.tarjetas.map((t) => ({
                  id: t.id,
                  titulo: t.titulo,
                  descripcion: t.descripcion,
                  imagenUrl: t.imagenUrl,
                  orientacion: t.orientacion || 'vertical-abajo',
                  tituloTipo: t.tituloTipo || 'h2',
                  tituloAlineacion: t.tituloAlineacion || 'left',
                  tituloColor: t.tituloColor || 'inherit',
                  descripcionTipo: t.descripcionTipo || 'p',
                  descripcionAlineacion: t.descripcionAlineacion || 'left',
                  descripcionColor: t.descripcionColor || 'inherit',
                  botonTexto: t.botonTexto || '',
                  botonUrl: t.botonUrl || '',
                })),
              },
            };
          }
          return sec;
        });

        formData.append('secciones', JSON.stringify(seccionesMetadata));

        this.secciones.forEach((sec) => {
          if (sec.tipo === 'tarjetas' && sec.datos.tarjetas) {
            sec.datos.tarjetas.forEach((t) => {
              if (t.imagenFile) {
                formData.append(`tarjeta_imagen_${sec.id}_${t.id}`, t.imagenFile);
              }
            });
          }
        });

        formData.append('bloques', JSON.stringify(serializarBloquesParaEnvio(this.bloques)));
        adjuntarImagenesDeBloques(formData, this.bloques);

        const config = await $fetch('/api/landing-builder/config', {
          method: 'POST',
          body: formData,
        });

        this.logoUrl = sincronizarLogoDesdeConfig(this.logoUrl, config.logoUrl);
        this.logoSecundarioUrl = sincronizarLogoDesdeConfig(
          this.logoSecundarioUrl,
          config.logoSecundarioUrl
        );
        this.logoTerceroUrl = sincronizarLogoDesdeConfig(
          this.logoTerceroUrl,
          config.logoTerceroUrl
        );
        this.logoCuartoUrl = sincronizarLogoDesdeConfig(this.logoCuartoUrl, config.logoCuartoUrl);
        this.logoRedirectUrl = config.logoRedirectUrl || null;
        this.logoSecundarioRedirectUrl = config.logoSecundarioRedirectUrl || null;
        this.logoTerceroRedirectUrl = config.logoTerceroRedirectUrl || null;
        this.logoCuartoRedirectUrl = config.logoCuartoRedirectUrl || null;
        this.secciones = config.secciones || [];
        this.bloques = config.bloques || [];
        this.logoFile = null;
        this.logoSecundarioFile = null;
        this.logoTerceroFile = null;
        this.logoCuartoFile = null;
        this.tarjetas = config.tarjetas ?? [];
        this.tarjetaImagenFiles = {};

        this.saveSuccess = true;
        this.mensajeExito = 'Configuración guardada.';
      } catch (err) {
        console.error('Error al guardar la configuración de la landing page:', err);
        this.error =
          err?.data?.statusMessage || 'No se pudo guardar la configuración. Intenta de nuevo.';
      } finally {
        this.isSaving = false;
      }
    },

    resolverUrlImagen(url) {
      if (!url) return '';
      if (
        url.startsWith('blob:') ||
        url.startsWith('data:') ||
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('//')
      ) {
        return url;
      }
      if (url.startsWith('/api/')) {
        const config = useRuntimeConfig();
        const base = config.app.baseURL || '/';
        const prefijo = base.endsWith('/') ? base.slice(0, -1) : base;
        return prefijo + url;
      }
      return url;
    },
  };
});
