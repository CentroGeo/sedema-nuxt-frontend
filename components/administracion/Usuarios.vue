<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

const emit = defineEmits(['ver-detalle-rol']);

const roles = ['Administrador', 'Editor', 'Visualizador'];

const usuarios = reactive([
  {
    id: 1,
    nombre: 'Saul morgado',
    correo: 'psp.saul@centrogeo.edu.mx',
    rol: 'Administrador',
    diasAcceso: 0,
  },
  {
    id: 2,
    nombre: 'Ara aguirre',
    correo: 'ara.aguirre@centrogeo.edu.mx',
    rol: 'Administrador',
    diasAcceso: 1,
  },
  {
    id: 3,
    nombre: 'Luis Martinez',
    correo: 'luis.martinez@centrogeo.edu.mx',
    rol: 'Editor',
    diasAcceso: 0,
  },
  {
    id: 4,
    nombre: 'Vicente Flores',
    correo: 'vicente.flores@centrogeo.edu.mx',
    rol: 'Editor',
    diasAcceso: 5,
  },
  {
    id: 5,
    nombre: 'Arturo Herrera',
    correo: 'arturo.herrera@centrogeo.edu.mx',
    rol: 'Editor',
    diasAcceso: 12,
  },
  {
    id: 6,
    nombre: 'Karen López',
    correo: 'karen.lopez@centrogeo.edu.mx',
    rol: 'Visualizador',
    diasAcceso: 20,
  },
  {
    id: 7,
    nombre: 'Pablo López',
    correo: 'pablo.lopez@centrogeo.edu.mx',
    rol: 'Visualizador',
    diasAcceso: 45,
  },
]);

let siguienteId = usuarios.length + 1;
const busqueda = ref('');

const usuariosFiltrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase();
  if (!texto) return usuarios;
  return usuarios.filter(
    (usuario) =>
      usuario.nombre.toLowerCase().includes(texto) || usuario.correo.toLowerCase().includes(texto)
  );
});

const totalUsuarios = computed(() => usuarios.length);
const totalAdministradores = computed(
  () => usuarios.filter((usuario) => usuario.rol === 'Administrador').length
);
const totalEditoresActivos = computed(
  () => usuarios.filter((usuario) => usuario.rol === 'Editor' && usuario.diasAcceso <= 30).length
);

function textoUltimoAcceso(dias) {
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Hace 1 día';
  return `Hace ${dias} días`;
}

function claseRol(rol) {
  if (rol === 'Administrador') {
    return 'texto-color-confirmacion fondo-color-confirmacion borde borde-color-confirmacion';
  }
  if (rol === 'Editor') {
    return 'texto-color-informacion fondo-color-informacion borde borde-color-informacion';
  }
  return 'texto-color-neutro fondo-color-neutro borde borde-color-neutro';
}

// --- Modal Nuevo usuario / Editar usuario ---
const modalUsuario = ref(null);
const modoModalUsuario = ref('crear');
const formularioUsuario = reactive({ id: null, nombre: '', correo: '', rol: 'Visualizador' });

function abrirModalNuevoUsuario() {
  modoModalUsuario.value = 'crear';
  formularioUsuario.id = null;
  formularioUsuario.nombre = '';
  formularioUsuario.correo = '';
  formularioUsuario.rol = 'Visualizador';
  modalUsuario.value?.abrirModal();
}

function abrirModalEditarUsuario(usuario) {
  modoModalUsuario.value = 'editar';
  formularioUsuario.id = usuario.id;
  formularioUsuario.nombre = usuario.nombre;
  formularioUsuario.correo = usuario.correo;
  formularioUsuario.rol = usuario.rol;
  modalUsuario.value?.abrirModal();
}

function guardarUsuario() {
  if (!formularioUsuario.nombre.trim() || !formularioUsuario.correo.trim()) return;

  if (modoModalUsuario.value === 'crear') {
    usuarios.push({
      id: siguienteId++,
      nombre: formularioUsuario.nombre.trim(),
      correo: formularioUsuario.correo.trim(),
      rol: formularioUsuario.rol,
      diasAcceso: 0,
    });
  } else {
    const usuario = usuarios.find((item) => item.id === formularioUsuario.id);
    if (usuario) {
      usuario.nombre = formularioUsuario.nombre.trim();
      usuario.correo = formularioUsuario.correo.trim();
      usuario.rol = formularioUsuario.rol;
    }
  }
  modalUsuario.value?.cerrarModal();
}

// --- Modal Eliminar usuario ---
const modalEliminarUsuario = ref(null);
const usuarioAEliminar = ref(null);

function abrirModalEliminarUsuario(usuario) {
  usuarioAEliminar.value = usuario;
  modalEliminarUsuario.value?.abrirModal();
}

function confirmarEliminarUsuario() {
  const indice = usuarios.findIndex((usuario) => usuario.id === usuarioAEliminar.value?.id);
  if (indice !== -1) usuarios.splice(indice, 1);
  modalEliminarUsuario.value?.cerrarModal();
}

function verDetalleRolDe(usuario) {
  emit('ver-detalle-rol', usuario.rol);
}
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
            <p class="texto-color-secundario m-0">con acceso completo</p>
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
          <form class="campo-busqueda" style="height: 40px" @submit.prevent>
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
              type="button"
            >
              <span class="pictograma-buscar" aria-hidden="true" />
            </button>
          </form>
        </ClientOnly>
      </div>
      <div class="flex-vertical-final">
        <button type="button" class="boton-primario" @click="abrirModalNuevoUsuario">
          <span class="pictograma-agregar" aria-hidden="true" /> Nuevo usuario
        </button>
      </div>
    </div>

    <div class="contenedor-tabla">
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
          <tr v-for="usuario in usuariosFiltrados" :key="usuario.id">
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
                  @click="abrirModalEditarUsuario(usuario)"
                >
                  <span class="pictograma-editar" aria-hidden="true" /> Editar
                </button>
                <button
                  class="boton-pictograma boton-secundario"
                  aria-label="Eliminar usuario"
                  type="button"
                  @click="abrirModalEliminarUsuario(usuario)"
                >
                  <span class="pictograma-eliminar" aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ClientOnly>
      <SisdaiModal ref="modalUsuario">
        <template #encabezado>
          <h2>{{ modoModalUsuario === 'crear' ? 'Nuevo usuario' : 'Editar permisos' }}</h2>
        </template>
        <template #cuerpo>
          <label for="usuario-nombre">Nombre</label>
          <input id="usuario-nombre" v-model="formularioUsuario.nombre" type="text" class="m-b-2" />

          <label for="usuario-correo">Correo electrónico</label>
          <input
            id="usuario-correo"
            v-model="formularioUsuario.correo"
            type="email"
            class="m-b-2"
          />

          <label for="usuario-rol">Rol</label>
          <select id="usuario-rol" v-model="formularioUsuario.rol">
            <option v-for="rol in roles" :key="rol" :value="rol">{{ rol }}</option>
          </select>
        </template>
        <template #pie>
          <button
            class="boton-secundario boton-chico"
            type="button"
            @click="modalUsuario.cerrarModal()"
          >
            Cancelar
          </button>
          <button class="boton-primario boton-chico" type="button" @click="guardarUsuario">
            Guardar
          </button>
        </template>
      </SisdaiModal>

      <SisdaiModal ref="modalEliminarUsuario">
        <template #encabezado>
          <h2>Eliminar usuario</h2>
        </template>
        <template #cuerpo>
          <p>
            ¿Deseas eliminar a <strong>{{ usuarioAEliminar?.nombre }}</strong
            >? Perderá acceso a la plataforma de inmediato.
          </p>
        </template>
        <template #pie>
          <button
            class="boton-secundario boton-chico"
            type="button"
            @click="modalEliminarUsuario.cerrarModal()"
          >
            Cancelar
          </button>
          <button
            class="boton-primario boton-chico"
            type="button"
            @click="confirmarEliminarUsuario"
          >
            Eliminar
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
