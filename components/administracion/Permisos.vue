<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

const store = useAdministracionStore();

// --- Navegación interna: general / detalle de rol ---
const vista = ref('general');
const rolSeleccionado = ref(null);

function verDetalleRol(rol) {
  rolSeleccionado.value = rol;
  vista.value = 'detalle-rol';
}

function verDetalleRolPorNombre(nombreRol) {
  const rol = store.todosLosRoles.find((item) => item.nombre === nombreRol);
  if (rol) verDetalleRol(rol);
}

function volverAVistaGeneral() {
  vista.value = 'general';
  rolSeleccionado.value = null;
}

// --- Modal Nuevo / Editar rol personalizado ---
const modalRol = ref(null);
const modoModalRol = ref('crear');
const formularioRol = reactive({ id: null, nombre: '', descripcion: '' });

function abrirModalNuevoRol() {
  modoModalRol.value = 'crear';
  formularioRol.id = null;
  formularioRol.nombre = '';
  formularioRol.descripcion = '';
  modalRol.value?.abrirModal();
}

function abrirModalEditarRol(rol) {
  modoModalRol.value = 'editar';
  formularioRol.id = rol.id;
  formularioRol.nombre = rol.nombre;
  formularioRol.descripcion = rol.descripcion;
  modalRol.value?.abrirModal();
}

function guardarRol() {
  if (!formularioRol.nombre.trim()) return;

  if (modoModalRol.value === 'crear') {
    store.crearRolPersonalizado({
      nombre: formularioRol.nombre,
      descripcion: formularioRol.descripcion,
    });
  } else {
    store.actualizarRolPersonalizado(formularioRol.id, {
      nombre: formularioRol.nombre,
      descripcion: formularioRol.descripcion,
    });
  }
  modalRol.value?.cerrarModal();
}

// --- Modal Eliminar rol personalizado ---
const modalEliminarRol = ref(null);
const rolAEliminar = ref(null);

function abrirModalEliminarRol(rol) {
  rolAEliminar.value = rol;
  modalEliminarRol.value?.abrirModal();
}

function confirmarEliminarRol() {
  const id = rolAEliminar.value?.id;
  store.eliminarRolPersonalizado(id);
  if (vista.value === 'detalle-rol' && rolSeleccionado.value?.id === id) {
    volverAVistaGeneral();
  }
  modalEliminarRol.value?.cerrarModal();
}
</script>

<template>
  <div class="administracion-permisos">
    <!-- ============ VISTA GENERAL ============ -->
    <section v-if="vista === 'general'" aria-label="Permisos">
      <p class="texto-color-secundario m-b-4">
        Roles disponibles en la plataforma y los módulos a los que cada uno puede acceder. Las
        columnas en gris corresponden a módulos deshabilitados en Gestión de módulos y no pueden
        asignarse.
      </p>

      <div class="flex m-b-4">
        <div v-for="rol in store.rolesBase" :key="rol.id" class="columna-5">
          <div class="tarjeta administracion-rol-tarjeta">
            <div class="tarjeta-cuerpo">
              <span class="p-1 borde-redondeado-8" :class="store.claseColorRol(rol.color)">{{
                rol.nombre
              }}</span>
              <p class="m-t-2 m-b-2">{{ rol.descripcion }}</p>
              <p class="texto-color-secundario m-0">
                {{ store.totalModulosAccesibles(rol) }} módulo(s) accesibles
              </p>
            </div>
          </div>
        </div>
      </div>

      <h3>Asociación de módulos por rol</h3>
      <div class="contenedor-tabla m-b-4">
        <table class="tabla-expandida">
          <caption>
            Matriz de acceso módulo por rol
          </caption>
          <thead>
            <tr>
              <th scope="col">Módulo</th>
              <th v-for="rol in store.todosLosRoles" :key="rol.id" scope="col">{{ rol.nombre }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="modulo in store.modulos"
              :key="modulo.id"
              :class="{ 'administracion-fila-inactiva': !modulo.habilitado }"
            >
              <td>
                {{ modulo.nombre }}
                <span v-if="!modulo.habilitado" class="texto-color-neutro"> (deshabilitado)</span>
              </td>
              <td v-for="rol in store.todosLosRoles" :key="rol.id">
                <span
                  v-if="rol.id === 'administrador'"
                  v-globo-informacion="'Acceso completo, no editable'"
                  class="pictograma-aprobado texto-color-confirmacion"
                  :class="{ 'texto-color-neutro': !modulo.habilitado }"
                  aria-label="Acceso completo"
                />
                <AdministracionSwitch
                  v-else
                  :model-value="store.tienePermiso(rol.id, modulo.id)"
                  :disabled="!modulo.habilitado"
                  ocultar-texto
                  :aria-label="`Alternar acceso de ${rol.nombre} a ${modulo.nombre}`"
                  @update:model-value="store.alternarPermiso(rol, modulo)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-contenido-separado m-b-3">
        <h3 class="m-0">Roles personalizados</h3>
        <button type="button" class="boton-primario boton-chico" @click="abrirModalNuevoRol">
          <span class="pictograma-agregar" aria-hidden="true" /> Nuevo rol
        </button>
      </div>

      <div class="flex m-b-4">
        <div v-for="rol in store.rolesPersonalizados" :key="rol.id" class="columna-5">
          <div class="tarjeta administracion-rol-tarjeta">
            <div class="tarjeta-cuerpo">
              <span class="p-1 borde-redondeado-8" :class="store.claseColorRol(rol.color)">{{
                rol.nombre
              }}</span>
              <p class="m-t-2 m-b-2">{{ rol.descripcion }}</p>
              <p class="texto-color-secundario m-0">
                {{ store.totalModulosAccesibles(rol) }} módulo(s) accesibles
              </p>
              <div class="flex m-t-2" style="gap: 8px">
                <button
                  type="button"
                  class="boton-secundario boton-chico"
                  @click="verDetalleRol(rol)"
                >
                  Ver detalle
                </button>
                <button
                  type="button"
                  class="boton-pictograma boton-secundario"
                  aria-label="Editar rol"
                  @click="abrirModalEditarRol(rol)"
                >
                  <span class="pictograma-editar" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="boton-pictograma boton-secundario"
                  aria-label="Eliminar rol"
                  @click="abrirModalEliminarRol(rol)"
                >
                  <span class="pictograma-eliminar" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <p v-if="!store.rolesPersonalizados.length" class="texto-color-secundario">
          Aún no hay roles personalizados.
        </p>
      </div>

      <h3>Usuarios y accesos individuales</h3>
      <p class="texto-color-secundario m-b-3">
        Cada usuario hereda los módulos del rol que tenga asignado en el directorio.
      </p>
      <AdministracionUsuarios @ver-detalle-rol="verDetalleRolPorNombre" />
    </section>

    <!-- ============ DETALLE DE ROL ============ -->
    <section v-else aria-label="Detalle de rol">
      <button type="button" class="boton-secundario boton-chico m-b-3" @click="volverAVistaGeneral">
        <span class="pictograma-flecha-izquierda" aria-hidden="true" /> Volver a la vista general
      </button>

      <div class="flex flex-contenido-separado">
        <div>
          <span class="p-1 borde-redondeado-8" :class="store.claseColorRol(rolSeleccionado.color)">
            {{ rolSeleccionado.nombre }}
          </span>
          <p class="m-t-2">{{ rolSeleccionado.descripcion }}</p>
        </div>
        <div v-if="rolSeleccionado.esPersonalizado" class="flex" style="gap: 8px">
          <button
            type="button"
            class="boton-secundario boton-chico"
            @click="abrirModalEditarRol(rolSeleccionado)"
          >
            <span class="pictograma-editar" aria-hidden="true" /> Editar
          </button>
          <button
            type="button"
            class="boton-secundario boton-chico"
            @click="abrirModalEliminarRol(rolSeleccionado)"
          >
            <span class="pictograma-eliminar" aria-hidden="true" /> Eliminar
          </button>
        </div>
      </div>

      <h3>Módulos asignados</h3>
      <ul class="administracion-submodulos">
        <li
          v-for="modulo in store.modulos"
          :key="modulo.id"
          class="flex flex-contenido-separado"
          :class="{ 'administracion-fila-inactiva': !modulo.habilitado }"
        >
          <span :class="{ 'texto-color-neutro': !modulo.habilitado }">
            {{ modulo.nombre }}
            <span v-if="!modulo.habilitado" class="texto-color-neutro">(deshabilitado)</span>
          </span>
          <span
            v-if="rolSeleccionado.id === 'administrador'"
            v-globo-informacion="'Acceso completo, no editable'"
            class="pictograma-aprobado texto-color-confirmacion"
            :class="{ 'texto-color-neutro': !modulo.habilitado }"
            aria-label="Acceso completo"
          />
          <AdministracionSwitch
            v-else
            :model-value="store.tienePermiso(rolSeleccionado.id, modulo.id)"
            :disabled="!modulo.habilitado"
            ocultar-texto
            :aria-label="`Alternar acceso de ${rolSeleccionado.nombre} a ${modulo.nombre}`"
            @update:model-value="store.alternarPermiso(rolSeleccionado, modulo)"
          />
        </li>
      </ul>
    </section>

    <ClientOnly>
      <SisdaiModal ref="modalRol">
        <template #encabezado>
          <h2>{{ modoModalRol === 'crear' ? 'Nuevo rol personalizado' : 'Editar rol' }}</h2>
        </template>
        <template #cuerpo>
          <label for="rol-nombre">Nombre</label>
          <input id="rol-nombre" v-model="formularioRol.nombre" type="text" class="m-b-2" />

          <label for="rol-descripcion">Descripción</label>
          <textarea
            id="rol-descripcion"
            v-model="formularioRol.descripcion"
            rows="3"
            class="m-b-2"
          />
        </template>
        <template #pie>
          <button
            class="boton-secundario boton-chico"
            type="button"
            @click="modalRol.cerrarModal()"
          >
            Cancelar
          </button>
          <button class="boton-primario boton-chico" type="button" @click="guardarRol">
            Guardar
          </button>
        </template>
      </SisdaiModal>

      <SisdaiModal ref="modalEliminarRol">
        <template #encabezado>
          <h2>Eliminar rol</h2>
        </template>
        <template #cuerpo>
          <p>
            ¿Deseas eliminar el rol <strong>{{ rolAEliminar?.nombre }}</strong
            >? Los usuarios que lo tengan asignado se quedarán sin ese rol.
          </p>
        </template>
        <template #pie>
          <button
            class="boton-secundario boton-chico"
            type="button"
            @click="modalEliminarRol.cerrarModal()"
          >
            Cancelar
          </button>
          <button class="boton-primario boton-chico" type="button" @click="confirmarEliminarRol">
            Eliminar
          </button>
        </template>
      </SisdaiModal>
    </ClientOnly>
  </div>
</template>

<style lang="scss" scoped>
.administracion-rol-tarjeta {
  height: 100%;
}

.contenedor-tabla {
  width: 100%;
  overflow-x: auto;

  table {
    width: 100%;
  }
}

.administracion-submodulos {
  list-style: none;
  margin: 0;
  padding: 12px 0 0 28px;
  border-top: 1px solid var(--boton-secundario-deshabilitado-borde, #e0e0e0);

  li {
    align-items: center;
    padding: 8px 0;

    &:not(:last-child) {
      border-bottom: 1px solid var(--boton-secundario-deshabilitado-borde, #e0e0e0);
    }
  }
}

.administracion-fila-inactiva {
  opacity: 0.6;
}
</style>
