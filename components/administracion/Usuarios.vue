<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

const emit = defineEmits(['ver-detalle-rol']);
const store = useAdministracionStore();

const roles = ['Administrador', 'Editor', 'Visualizador'];
const perfiles = {
  Administrador: 'administrator',
  Editor: 'editor',
  Visualizador: 'viewer',
};
const etiquetas = {
  superuser: 'Superusuario',
  administrator: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador',
};
const usuarios = reactive([]);
const busqueda = ref('');
const paginaActual = ref(0);
const tamanioPagina = 20;
const mensajeExito = ref('');
const errorAccion = ref('');
let temporizadorBusqueda;
let solicitudActual = 0;

function mapearUsuario(usuario) {
  const fecha = usuario.last_login ? new Date(usuario.last_login) : null;
  const diasAcceso = fecha
    ? Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 86400000))
    : null;
  return {
    id: usuario.id,
    nombre: `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim() || usuario.username,
    correo: usuario.email || 'Sin correo',
    rol: etiquetas[usuario.profile] || 'Visualizador',
    diasAcceso,
    editable: usuario.editable,
  };
}

async function cargarUsuarios() {
  const solicitud = ++solicitudActual;
  try {
    const data = await store.cargarUsuarios({
      search: busqueda.value,
      page: paginaActual.value + 1,
    });
    // Descarta respuestas desfasadas si hubo otra búsqueda más reciente
    if (solicitud !== solicitudActual) return;
    usuarios.splice(0, usuarios.length, ...data.results.map(mapearUsuario));
  } catch {
    if (solicitud === solicitudActual) usuarios.splice(0);
  }
}

const totalUsuarios = computed(() => store.resumenUsuarios.total_users);
const totalPaginas = computed(() => Math.max(1, Math.ceil(store.totalUsuarios / tamanioPagina)));
const totalAdministradores = computed(() => store.resumenUsuarios.total_administrators);
const totalEditoresActivos = computed(() => store.resumenUsuarios.active_editors_30_days);

function textoUltimoAcceso(dias) {
  if (dias === null) return 'Sin registro';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Hace 1 día';
  return `Hace ${dias} días`;
}

function claseRol(rol) {
  if (rol === 'Administrador' || rol === 'Superusuario') {
    return 'texto-color-confirmacion fondo-color-confirmacion borde borde-color-confirmacion';
  }
  if (rol === 'Editor') {
    return 'texto-color-informacion fondo-color-informacion borde borde-color-informacion';
  }
  return 'texto-color-neutro fondo-color-neutro borde borde-color-neutro';
}

const modalUsuario = ref(null);
const formularioUsuario = reactive({ id: null, nombre: '', correo: '', rol: 'Visualizador' });

function abrirModalEditarUsuario(usuario) {
  mensajeExito.value = '';
  errorAccion.value = '';
  formularioUsuario.id = usuario.id;
  formularioUsuario.nombre = usuario.nombre;
  formularioUsuario.correo = usuario.correo;
  formularioUsuario.rol = usuario.rol;
  modalUsuario.value?.abrirModal();
}

async function guardarUsuario() {
  errorAccion.value = '';
  mensajeExito.value = '';
  try {
    await store.cambiarPerfilUsuario(formularioUsuario.id, perfiles[formularioUsuario.rol]);
    await cargarUsuarios();
    mensajeExito.value = `El perfil de ${formularioUsuario.nombre} se actualizó correctamente.`;
    modalUsuario.value?.cerrarModal();
  } catch (error) {
    errorAccion.value = error.message;
  }
}

function verDetalleRolDe(usuario) {
  emit('ver-detalle-rol', usuario.rol);
}

function buscarUsuarios() {
  if (paginaActual.value !== 0) {
    paginaActual.value = 0;
  } else {
    cargarUsuarios();
  }
}

watch(busqueda, () => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(buscarUsuarios, 350);
});

watch(paginaActual, cargarUsuarios);

onMounted(cargarUsuarios);
onBeforeUnmount(() => clearTimeout(temporizadorBusqueda));
</script>

<template>
  <div class="administracion-usuarios">
    <div class="flex m-b-4">
      <div class="columna-5">
        <div class="tarjeta">
          <div class="tarjeta-cuerpo">
            <p class="texto-color-secundario m-0">Total de usuarios</p>
            <p class="h3 m-0">{{ totalUsuarios }}</p>
            <p class="texto-color-secundario m-0">en el sistema</p>
          </div>
        </div>
      </div>
      <div class="columna-5">
        <div class="tarjeta">
          <div class="tarjeta-cuerpo">
            <p class="texto-color-secundario m-0">Administradores</p>
            <p class="h3 m-0">{{ totalAdministradores }}</p>
            <p class="texto-color-secundario m-0">en el sistema</p>
          </div>
        </div>
      </div>
      <div class="columna-5">
        <div class="tarjeta">
          <div class="tarjeta-cuerpo">
            <p class="texto-color-secundario m-0">Editores activos</p>
            <p class="h3 m-0">{{ totalEditoresActivos }}</p>
            <p class="texto-color-secundario m-0">últimos 30 días</p>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-contenido-separado m-b-3">
      <div class="columna-10">
        <ClientOnly>
          <label for="buscador-usuarios">Buscar usuario</label>
          <form class="campo-busqueda" style="height: 40px" @submit.prevent="buscarUsuarios">
            <input
              id="buscador-usuarios"
              v-model="busqueda"
              type="search"
              class="campo-busqueda-entrada"
              placeholder="Buscar usuario..."
            />
            <button
              class="boton-primario boton-pictograma campo-busqueda-buscar"
              aria-label="Buscar"
              type="submit"
              :disabled="store.cargandoUsuarios"
            >
              <span class="pictograma-buscar" aria-hidden="true" />
            </button>
          </form>
        </ClientOnly>
      </div>
      <div class="flex-vertical-final">
        <button
          type="button"
          class="boton-primario"
          disabled
          title="Las identidades se crean en Keycloak"
        >
          <span class="pictograma-agregar" aria-hidden="true" /> Nuevo usuario
        </button>
      </div>
    </div>

    <p v-if="mensajeExito" class="alerta alerta-exito" role="status">{{ mensajeExito }}</p>
    <p v-if="store.errorUsuarios" class="alerta alerta-error" role="alert">
      {{ store.errorUsuarios }}
      <button class="boton-secundario boton-chico" type="button" @click="cargarUsuarios">
        Reintentar
      </button>
    </p>

    <div class="contenedor-tabla" :aria-busy="store.cargandoUsuarios">
      <table class="tabla-expandida">
        <caption>
          Directorio de usuarios
        </caption>
        <thead>
          <tr>
            <th scope="col">Usuario</th>
            <th scope="col">Correo electrónico</th>
            <th scope="col">Rol</th>
            <th scope="col">Último acceso</th>
            <th scope="col">Detalle</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.cargandoUsuarios">
            <td colspan="6" class="texto-centrado">Cargando usuarios…</td>
          </tr>
          <tr v-else-if="!usuarios.length && !store.errorUsuarios">
            <td colspan="6" class="texto-centrado">No se encontraron usuarios.</td>
          </tr>
          <template v-else>
            <tr v-for="usuario in usuarios" :key="usuario.id">
              <td>{{ usuario.nombre }}</td>
              <td>{{ usuario.correo }}</td>
              <td>
                <span class="p-1 borde-redondeado-8" :class="claseRol(usuario.rol)">
                  {{ usuario.rol }}
                </span>
              </td>
              <td>{{ textoUltimoAcceso(usuario.diasAcceso) }}</td>
              <td>
                <button
                  class="boton-secundario boton-chico"
                  type="button"
                  @click="verDetalleRolDe(usuario)"
                >
                  Ver detalle
                </button>
              </td>
              <td>
                <div class="flex-width flex" style="gap: 8px">
                  <button
                    class="boton-secundario boton-chico"
                    type="button"
                    :disabled="!usuario.editable"
                    @click="abrirModalEditarUsuario(usuario)"
                  >
                    <span class="pictograma-editar" aria-hidden="true" /> Editar
                  </button>
                  <button
                    class="boton-pictograma boton-secundario"
                    aria-label="Eliminar usuario"
                    type="button"
                    disabled
                    title="La desactivación de identidades se realiza en Keycloak"
                  >
                    <span class="pictograma-eliminar" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <UiPaginador
      v-if="!store.cargandoUsuarios && totalPaginas > 1"
      :pagina-parent="paginaActual"
      :total-paginas="totalPaginas"
      @cambio="paginaActual = $event"
    />

    <ClientOnly>
      <SisdaiModal ref="modalUsuario">
        <template #encabezado>
          <h2>Editar permisos</h2>
        </template>
        <template #cuerpo>
          <label for="usuario-nombre">Nombre</label>
          <input
            id="usuario-nombre"
            v-model="formularioUsuario.nombre"
            type="text"
            class="m-b-2"
            disabled
          />

          <label for="usuario-correo">Correo electrónico</label>
          <input
            id="usuario-correo"
            v-model="formularioUsuario.correo"
            type="email"
            class="m-b-2"
            disabled
          />

          <label for="usuario-rol">Rol</label>
          <select id="usuario-rol" v-model="formularioUsuario.rol">
            <option v-for="rol in roles" :key="rol" :value="rol">{{ rol }}</option>
          </select>
          <p v-if="errorAccion" class="alerta alerta-error m-t-2" role="alert">
            {{ errorAccion }}
          </p>
        </template>
        <template #pie>
          <button
            class="boton-secundario boton-chico"
            type="button"
            @click="modalUsuario.cerrarModal()"
          >
            Cancelar
          </button>
          <button
            class="boton-primario boton-chico"
            type="button"
            :disabled="store.guardandoPerfil"
            @click="guardarUsuario"
          >
            {{ store.guardandoPerfil ? 'Guardando…' : 'Guardar' }}
          </button>
        </template>
      </SisdaiModal>
    </ClientOnly>
  </div>
</template>

<style lang="scss" scoped>
.contenedor-tabla {
  width: 100%;
  overflow-x: auto;

  table {
    width: 100%;
  }
}
</style>
