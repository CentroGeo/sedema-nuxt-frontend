import { defineStore } from 'pinia';

export const useAdministracionStore = defineStore('administracion', () => {
  const {
    configuracion: configuracionModulos,
    submodulos: configuracionSubmodulos,
    cargarConfiguracionModulos,
    actualizarModulo,
    actualizarSubmodulo,
  } = useConfiguracionModulos();

  // --- Módulos (con submódulos anidados) ---
  const modulos = reactive([
    {
      id: 'catalogo',
      nombre: 'Catálogo',
      ruta: '/catalogo',
      descripcion: 'Exploración, carga y gestión de recursos del catálogo geoespacial.',
      habilitado: true,
      submodulos: [
        { id: 'catalogo-capas', nombre: 'Capas geográficas', habilitado: true },
        { id: 'catalogo-documentos', nombre: 'Documentos', habilitado: true },
        { id: 'catalogo-tablas', nombre: 'Datos tabulados', habilitado: true },
        { id: 'catalogo-mapas', nombre: 'Mapas', habilitado: true },
        { id: 'catalogo-externos', nombre: 'Catálogos externos', habilitado: true },
        { id: 'catalogo-cargar', nombre: 'Cargar archivos', habilitado: true },
        { id: 'catalogo-mis-archivos', nombre: 'Mis archivos', habilitado: true },
        { id: 'catalogo-revision', nombre: 'Revisión de solicitudes', habilitado: true },
        { id: 'catalogo-servicios-remotos', nombre: 'Servicios remotos', habilitado: true },
      ],
    },
    {
      id: 'consulta',
      nombre: 'Consulta',
      ruta: '/consulta',
      descripcion: 'Visualización de capas, documentos y tablas publicadas en el catálogo.',
      habilitado: true,
      submodulos: [
        { id: 'consulta-capas', nombre: 'Capas', habilitado: true },
        { id: 'consulta-documentos', nombre: 'Documentos', habilitado: true },
        { id: 'consulta-tablas', nombre: 'Tablas', habilitado: true },
        { id: 'consulta-mapas', nombre: 'Mapas', habilitado: true },
      ],
    },
    {
      id: 'geocontenidos',
      nombre: 'Geocontenidos',
      ruta: '/geocontenidos',
      descripcion: 'Autoría de mapas, panoramas, geo-historias y tableros de datos.',
      habilitado: true,
      submodulos: [
        { id: 'geocontenidos-mapas', nombre: 'Mapas', habilitado: true },
        { id: 'geocontenidos-panoramas', nombre: 'Panoramas', habilitado: true },
        { id: 'geocontenidos-geohistorias', nombre: 'Geo-historias', habilitado: true },
        { id: 'geocontenidos-tableros', nombre: 'Tableros de datos', habilitado: true },
        { id: 'geocontenidos-importar', nombre: 'Importar datos', habilitado: true },
        { id: 'geocontenidos-micrositios', nombre: 'Micrositios', habilitado: false },
      ],
    },
    {
      id: 'levantamiento',
      nombre: 'Levantamiento',
      ruta: '/levantamiento',
      descripcion: 'Gestión de aportes y proyectos de campo.',
      habilitado: true,
      submodulos: [
        { id: 'levantamiento-proyectos', nombre: 'Proyectos', habilitado: true },
        { id: 'levantamiento-aportes', nombre: 'Aportes', habilitado: true },
        { id: 'levantamiento-descargas', nombre: 'Descargas', habilitado: true },
        {
          id: 'levantamiento-revision-proyectos',
          nombre: 'Revisión de proyectos',
          habilitado: true,
        },
        { id: 'levantamiento-revision-aportes', nombre: 'Revisión de aportes', habilitado: true },
        {
          id: 'levantamiento-revision-descargas',
          nombre: 'Revisión de descargas',
          habilitado: true,
        },
      ],
    },
    {
      id: 'ia',
      nombre: 'Análisis IA',
      ruta: '/ia',
      descripcion: 'Chat semántico y proyectos de análisis con IA sobre documentos.',
      habilitado: false,
      submodulos: [
        { id: 'ia-proyectos', nombre: 'Proyectos IA', habilitado: false },
        { id: 'ia-chats', nombre: 'Chats', habilitado: false },
      ],
    },
  ]);

  // --- Roles ---
  const rolesBase = reactive([
    {
      id: 'administrador',
      nombre: 'Administrador',
      color: 'confirmacion',
      descripcion:
        'Acceso completo a todos los módulos habilitados y a la configuración de la plataforma.',
    },
    {
      id: 'editor',
      nombre: 'Editor',
      color: 'informacion',
      descripcion: 'Puede crear y editar contenido en los módulos que tenga asignados.',
    },
    {
      id: 'visualizador',
      nombre: 'Visualizador',
      color: 'neutro',
      descripcion: 'Solo puede consultar el contenido de los módulos que tenga asignados.',
    },
  ]);

  const rolesPersonalizados = reactive([
    {
      id: 'curador-metadatos',
      nombre: 'Curador de metadatos',
      color: 'acento',
      descripcion: 'Revisa y homologa categorías y metadatos publicados en el catálogo.',
      esPersonalizado: true,
    },
  ]);

  const todosLosRoles = computed(() => [...rolesBase, ...rolesPersonalizados]);

  // permisos[rolId] = array de ids de módulos asignados. Administrador no se
  // guarda aquí: su acceso es siempre total sobre lo que esté habilitado.
  const permisos = reactive({
    editor: ['catalogo', 'geocontenidos'],
    visualizador: ['catalogo', 'consulta'],
    'curador-metadatos': ['catalogo', 'consulta'],
  });

  function sincronizarModulos() {
    modulos.forEach((modulo) => {
      modulo.habilitado = configuracionModulos.value[modulo.id] ?? modulo.habilitado;
      modulo.submodulos.forEach((submodulo) => {
        submodulo.habilitado = configuracionSubmodulos.value[submodulo.id] ?? submodulo.habilitado;
      });
    });
  }

  watch([configuracionModulos, configuracionSubmodulos], sincronizarModulos, {
    deep: true,
    immediate: true,
  });

  async function cargarModulos() {
    await cargarConfiguracionModulos();
    sincronizarModulos();
  }

  async function actualizarEstadoModulo(moduloId, habilitado) {
    const modulo = modulos.find((item) => item.id === moduloId);
    if (!modulo) return;

    const valorAnterior = modulo.habilitado;
    modulo.habilitado = habilitado;

    try {
      await actualizarModulo(moduloId, habilitado);
    } catch (error) {
      modulo.habilitado = valorAnterior;
      throw error;
    }
  }

  async function actualizarEstadoSubmodulo(moduloId, submoduloId, habilitado) {
    const modulo = modulos.find((item) => item.id === moduloId);
    const submodulo = modulo?.submodulos.find((item) => item.id === submoduloId);
    if (!submodulo) return;

    const valorAnterior = submodulo.habilitado;
    submodulo.habilitado = habilitado;

    try {
      await actualizarSubmodulo(submoduloId, habilitado);
    } catch (error) {
      submodulo.habilitado = valorAnterior;
      throw error;
    }
  }

  function claseColorRol(color) {
    const mapa = {
      confirmacion:
        'texto-color-confirmacion fondo-color-confirmacion borde borde-color-confirmacion',
      informacion: 'texto-color-informacion fondo-color-informacion borde borde-color-informacion',
      neutro: 'texto-color-neutro fondo-color-neutro borde borde-color-neutro',
      acento: 'texto-color-acento fondo-color-acento borde borde-color-acento',
    };
    return mapa[color] ?? mapa.neutro;
  }

  function tienePermiso(rolId, moduloId) {
    if (rolId === 'administrador') return true;
    return permisos[rolId]?.includes(moduloId) ?? false;
  }

  function alternarPermiso(rol, modulo) {
    if (rol.id === 'administrador' || !modulo.habilitado) return;
    const lista = permisos[rol.id] ?? (permisos[rol.id] = []);
    const indice = lista.indexOf(modulo.id);
    if (indice === -1) lista.push(modulo.id);
    else lista.splice(indice, 1);
  }

  function totalModulosAccesibles(rol) {
    return modulos.filter((modulo) => modulo.habilitado && tienePermiso(rol.id, modulo.id)).length;
  }

  function rolesConAccesoA(moduloId) {
    return todosLosRoles.value.filter((rol) => tienePermiso(rol.id, moduloId));
  }

  // --- CRUD de roles personalizados ---
  let siguienteIdRol = 1;

  function crearRolPersonalizado({ nombre, descripcion }) {
    const id = `personalizado-${siguienteIdRol++}`;
    rolesPersonalizados.push({
      id,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      color: 'acento',
      esPersonalizado: true,
    });
    permisos[id] = [];
    return id;
  }

  function actualizarRolPersonalizado(id, { nombre, descripcion }) {
    const rol = rolesPersonalizados.find((item) => item.id === id);
    if (rol) {
      rol.nombre = nombre.trim();
      rol.descripcion = descripcion.trim();
    }
  }

  function eliminarRolPersonalizado(id) {
    const indice = rolesPersonalizados.findIndex((rol) => rol.id === id);
    if (indice !== -1) rolesPersonalizados.splice(indice, 1);
    delete permisos[id];
  }

  return {
    modulos,
    rolesBase,
    rolesPersonalizados,
    todosLosRoles,
    permisos,
    cargarModulos,
    actualizarEstadoModulo,
    actualizarEstadoSubmodulo,
    claseColorRol,
    tienePermiso,
    alternarPermiso,
    totalModulosAccesibles,
    rolesConAccesoA,
    crearRolPersonalizado,
    actualizarRolPersonalizado,
    eliminarRolPersonalizado,
  };
});
