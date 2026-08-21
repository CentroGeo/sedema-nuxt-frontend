<script setup>
const store = useAdministracionStore();

const expandido = reactive({});
const error = ref('');

onMounted(() => {
  store.cargarModulos().catch(() => {
    error.value = 'No fue posible cargar la configuración global de módulos.';
  });
});

function claseEstado(activo) {
  return activo
    ? 'texto-color-confirmacion fondo-color-confirmacion borde borde-color-confirmacion'
    : 'texto-color-neutro fondo-color-neutro borde borde-color-neutro';
}

// --- Navegación interna: general / detalle ---
const vista = ref('general');
const moduloSeleccionado = ref(null);

function verDetalleModulo(modulo) {
  moduloSeleccionado.value = modulo;
  vista.value = 'detalle-modulo';
}

function volverAVistaGeneral() {
  vista.value = 'general';
  moduloSeleccionado.value = null;
}

async function actualizarModulo(modulo, habilitado) {
  error.value = '';
  try {
    await store.actualizarEstadoModulo(modulo.id, habilitado);
  } catch (err) {
    error.value = err.message || 'No fue posible guardar el cambio del módulo.';
  }
}

async function actualizarSubmodulo(modulo, submodulo, habilitado) {
  error.value = '';
  try {
    await store.actualizarEstadoSubmodulo(modulo.id, submodulo.id, habilitado);
  } catch (err) {
    error.value = err.message || 'No fue posible guardar el cambio del submódulo.';
  }
}
</script>

<template>
  <div class="administracion-modulos">
    <!-- ============ VISTA GENERAL ============ -->
    <section v-if="vista === 'general'" aria-label="Módulos">
      <p class="texto-color-secundario m-b-4">
        Esta configuración se aplica globalmente en el sitio. Un módulo deshabilitado deja de ser
        accesible por URL y deja de poder asignarse a cualquier rol en Gestión de permisos.
      </p>

      <p v-if="error" class="texto-color-error m-b-3" role="alert">{{ error }}</p>

      <div
        v-for="modulo in store.modulos"
        :key="modulo.id"
        class="tarjeta administracion-modulo-tarjeta m-b-3"
      >
        <div class="tarjeta-cuerpo">
          <div class="flex flex-contenido-separado">
            <div class="administracion-modulo-info">
              <button
                type="button"
                class="administracion-expandir-boton"
                :aria-expanded="Boolean(expandido[modulo.id])"
                :aria-controls="`administracion-submodulos-${modulo.id}`"
                @click="expandido[modulo.id] = !expandido[modulo.id]"
              >
                <span
                  :class="
                    expandido[modulo.id] ? 'pictograma-angulo-abajo' : 'pictograma-angulo-derecho'
                  "
                  aria-hidden="true"
                />
                <strong>{{ modulo.nombre }}</strong>
                <span class="texto-color-secundario"
                  >({{ modulo.submodulos.length }} submódulos)</span
                >
              </button>
              <p class="texto-color-secundario m-0">{{ modulo.descripcion }}</p>
              <p class="texto-color-secundario m-0">
                <code>{{ modulo.ruta }}</code>
              </p>
            </div>

            <div class="flex administracion-columna-derecha administracion-modulo-acciones">
              <span
                class="p-1 borde-redondeado-8 administracion-estado-badge"
                :class="claseEstado(modulo.habilitado)"
              >
                {{ modulo.habilitado ? 'Activo' : 'Inactivo' }}
              </span>
              <AdministracionSwitch
                :model-value="modulo.habilitado"
                ocultar-texto
                :aria-label="`Alternar módulo ${modulo.nombre}`"
                @update:model-value="actualizarModulo(modulo, $event)"
              />
              <button
                type="button"
                class="boton-secundario boton-chico"
                @click="verDetalleModulo(modulo)"
              >
                Ver detalle
              </button>
            </div>
          </div>

          <ul
            v-if="expandido[modulo.id]"
            :id="`administracion-submodulos-${modulo.id}`"
            class="administracion-submodulos m-t-3"
          >
            <li v-for="sub in modulo.submodulos" :key="sub.id" class="flex flex-contenido-separado">
              <span :class="{ 'texto-color-secundario': !modulo.habilitado }">{{
                sub.nombre
              }}</span>
              <div class="flex administracion-columna-derecha" style="gap: 12px">
                <span
                  class="p-1 borde-redondeado-8 administracion-estado-badge"
                  :class="claseEstado(modulo.habilitado && sub.habilitado)"
                >
                  {{ modulo.habilitado && sub.habilitado ? 'Activo' : 'Inactivo' }}
                </span>
                <AdministracionSwitch
                  :model-value="sub.habilitado"
                  :disabled="!modulo.habilitado"
                  ocultar-texto
                  :aria-label="`Alternar submódulo ${sub.nombre}`"
                  @update:model-value="actualizarSubmodulo(modulo, sub, $event)"
                />
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ============ DETALLE DE MÓDULO ============ -->
    <section v-else aria-label="Detalle de módulo">
      <button type="button" class="boton-secundario boton-chico m-b-3" @click="volverAVistaGeneral">
        <span class="pictograma-flecha-izquierda" aria-hidden="true" /> Volver a la vista general
      </button>

      <div class="flex flex-contenido-separado">
        <div>
          <h2 class="m-0">{{ moduloSeleccionado.nombre }}</h2>
          <p class="texto-color-secundario m-0">
            <code>{{ moduloSeleccionado.ruta }}</code>
          </p>
        </div>
        <div class="flex administracion-columna-derecha" style="gap: 12px">
          <span
            class="p-1 borde-redondeado-8 administracion-estado-badge"
            :class="claseEstado(moduloSeleccionado.habilitado)"
          >
            {{ moduloSeleccionado.habilitado ? 'Activo' : 'Inactivo' }}
          </span>
          <AdministracionSwitch
            :model-value="moduloSeleccionado.habilitado"
            :aria-label="`Alternar módulo ${moduloSeleccionado.nombre}`"
            @update:model-value="actualizarModulo(moduloSeleccionado, $event)"
          />
        </div>
      </div>

      <p class="m-t-3">{{ moduloSeleccionado.descripcion }}</p>

      <h3>Submódulos</h3>
      <ul class="administracion-submodulos">
        <li
          v-for="sub in moduloSeleccionado.submodulos"
          :key="sub.id"
          class="flex flex-contenido-separado"
        >
          <span>{{ sub.nombre }}</span>
          <div class="flex administracion-columna-derecha" style="gap: 12px">
            <span
              class="p-1 borde-redondeado-8"
              :class="claseEstado(moduloSeleccionado.habilitado && sub.habilitado)"
            >
              {{ moduloSeleccionado.habilitado && sub.habilitado ? 'Activo' : 'Inactivo' }}
            </span>
            <AdministracionSwitch
              :model-value="sub.habilitado"
              :disabled="!moduloSeleccionado.habilitado"
              ocultar-texto
              :aria-label="`Alternar submódulo ${sub.nombre}`"
              @update:model-value="actualizarSubmodulo(moduloSeleccionado, sub, $event)"
            />
          </div>
        </li>
      </ul>

      <h3>Roles con acceso a este módulo</h3>
      <div v-if="store.rolesConAccesoA(moduloSeleccionado.id).length" class="flex" style="gap: 8px">
        <span
          v-for="rol in store.rolesConAccesoA(moduloSeleccionado.id)"
          :key="rol.id"
          class="p-1 borde-redondeado-8"
          :class="store.claseColorRol(rol.color)"
        >
          {{ rol.nombre }}
        </span>
      </div>
      <p v-else class="texto-color-secundario">Ningún rol tiene acceso a este módulo todavía.</p>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.administracion-modulo-tarjeta {
  .administracion-expandir-boton {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    padding: 0;
    box-shadow: none;
    cursor: pointer;
    font-size: 1rem;
    margin-bottom: 4px;
  }

  .administracion-modulo-acciones {
    gap: 16px;
    flex: 0 0 auto;
  }
}

.administracion-columna-derecha {
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
}

.administracion-estado-badge {
  display: inline-block;
  width: 84px;
  text-align: center;
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
</style>
