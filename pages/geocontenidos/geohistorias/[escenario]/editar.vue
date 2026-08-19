<script setup>
import useApi from '~/composables/geocontenidos/useApi';
import { wait } from '~/utils/consulta';

definePageMeta({ middleware: 'auth' });

const { escenario: escenarioId } = useRoute().params;
const formulario = reactive({
  description: '',
  is_public: false,
  name: '',
  scenes_layout_styles: {
    map_panel: 50,
    text_panel: 50,
    timeline_position: 'top',
    gradient_end: '#e755f7',
    gradient_start: '#9333ea',
  },
  url_id: '',
});

const estatusAlGuardar = reactive({
  cargando: false,
  estado: true,
  textoCargando: 'Guardando...',
  mensaje: '',
});

const { api, modal, mostrarModalCargando, mostrarModalError, mostrarModalExito } = useApi();

async function cargarDatosEscenario() {
  if (escenarioId === 'nuevo') return;

  mostrarModalCargando('Cargando escenario...');
  const { respuesta, datos } = await api(`scenarios/${escenarioId}`);

  if (!respuesta.ok) {
    mostrarModalError([datos.detail]);
    modal.permitirCerrar = false;
    return;
  }

  Object.assign(formulario, datos);
  modal.visible = false;
}
cargarDatosEscenario();

const nombre = computed({
  get: () => formulario.name,
  set(nuevoValor) {
    formulario.name = nuevoValor;
    formulario.url_id = nuevoValor
      .toLowerCase()
      .replace(/\s+/g, '-')
      // eslint-disable-next-line no-useless-escape
      .replace(/[^a-z0-9\-]/g, '');
  },
});

const distribucionLayout = computed({
  get: () => formulario.scenes_layout_styles.text_panel,
  set(nuevoValor) {
    formulario.scenes_layout_styles.text_panel = Number(nuevoValor);
    formulario.scenes_layout_styles.map_panel = 100 - nuevoValor;
  },
});

const accionGuardar = ref('');
async function guardarCambios() {
  mostrarModalCargando('Guardando...');

  const url = `scenarios/${escenarioId !== 'nuevo' ? `${escenarioId}/` : ''}/`;
  const { datos } = await api(url, escenarioId === 'nuevo' ? 'POST' : 'PUT', formulario);

  if (datos?.success === false) {
    mostrarModalError(datos.errors);
    return;
  }

  mostrarModalExito();

  setTimeout(() => {
    const botonCerrar = document.querySelector(
      '.sisdai-modal button, .sisdai-modal [aria-label="Cerrar"]'
    );
    if (botonCerrar) {
      botonCerrar.focus();
    }
  }, 100);

  await wait(1500);
  modal.visible = false;

  if (accionGuardar.value === 'escenas') {
    navigateTo(`/geocontenidos/geohistorias/${datos.id}/escenas`);
  } else if (escenarioId === 'nuevo') {
    navigateTo(`/geocontenidos/geohistorias/${datos.id}/editar`);
  } else {
    reloadNuxtApp();
  }
}
</script>

<template>
  <form @submit.prevent="guardarCambios">
    <section>
      <div class="flex p-y-3">
        <NuxtLink to="/geocontenidos/geohistorias" class="boton boton-secundario boton-chico">
          <span class="pictograma-flecha-izquierda m-r-1" />
        </NuxtLink>

        <h2 class="m-0">Edición del escenario</h2>
      </div>

      <div class="m-b-4">
        <label for="nombre">Nombre de la historia</label>
        <input
          id="nombre"
          v-model="nombre"
          type="text"
          placeholder="Ej: Análisis de Zonas Urbanas 2024"
          required
        />
      </div>

      <div class="m-b-4">
        <label for="descripcion">
          Descripción ({{ formulario.description.length }} / {{ 250 }})
        </label>
        <textarea
          id="descripcion"
          v-model="formulario.description"
          placeholder="Describa brevemente de qué trata este escenario"
          :maxlength="250"
          required
        />
        <p class="formulario-ayuda" aria-live="polite" role="status">
          Usa esta sección para una breve descripción que ayudará a otros a entender el propósito de
          este escenario
        </p>
      </div>

      <div class="m-b-4">
        <input id="casilla-identificadorgrupaluno" v-model="formulario.is_public" type="checkbox" />
        <label for="casilla-identificadorgrupaluno">Hacer público este escenario</label>
        <p class="formulario-ayuda" aria-live="polite" role="status">
          Si está marcada, cualquier usuario podrá ver este escenario.
        </p>
      </div>

      <div class="m-b-4">
        <label for="posicion">Posición de la línea del tiempo</label>
        <select id="posicion" v-model="formulario.scenes_layout_styles.timeline_position">
          <option value="top">Arriba</option>
          <option value="bottom">Abajo</option>
        </select>
      </div>
    </section>

    <section>
      <h2>Colores del Tema</h2>

      <p>Personaliza los colores de la línea del tiempo</p>

      <div class="flex flex-contenido-separado m-b-2">
        <div>
          <label for="color-primario">Color primario</label>
          <input
            id="color-primario"
            v-model="formulario.scenes_layout_styles.gradient_start"
            type="color"
            name="color-primario"
          />
        </div>

        <div>
          <label for="color-secundario">Color secundario</label>
          <input
            id="color-secundario"
            v-model="formulario.scenes_layout_styles.gradient_end"
            type="color"
            name="color-secundario"
          />
        </div>
      </div>

      <label>Vista previa del gradiente</label>
      <div
        class="borde borde-color-secundario borde-redondeado-8 m-b-4"
        :style="{
          background: `linear-gradient(to right, ${formulario.scenes_layout_styles.gradient_start}, ${formulario.scenes_layout_styles.gradient_end})`,
        }"
        style="height: 200px"
      />
    </section>

    <section>
      <h2>Distribución del layout</h2>

      <p>Ajusta el espacio que ocupará el panel de texto y el panel del mapa</p>

      <div>
        <label for="" class="flex flex-contenido-separado">
          <span>Panel de texto: {{ distribucionLayout }}%</span>
          <span>Panel del mapa: {{ formulario.scenes_layout_styles.map_panel }}%</span>
        </label>
        <input v-model="distribucionLayout" type="range" min="20" max="80" />
      </div>

      <div class="m-b-4">
        <label>Vista previa de la distribución</label>
        <div class="flex texto-tamanio-10" style="height: 200px; gap: 0">
          <span
            class="pictograma-reporte borde borde-color-secundario borde-l-redondeado-8 borde-r-redondeado-0"
            :style="{ width: formulario.scenes_layout_styles.text_panel + '%' }"
            style="align-items: center; justify-content: center"
          />
          <span
            class="pictograma-mexico borde borde-color-secundario borde-l-redondeado-0 borde-r-redondeado-8"
            style="flex: 1; align-items: center; justify-content: center"
          />
        </div>
      </div>
    </section>

    <section class="flex" style="justify-content: space-between; align-items: center">
      <NuxtLink to="/geocontenidos/geohistorias" class="boton boton-secundario">Volver</NuxtLink>

      <div style="display: flex; gap: 1rem">
        <button type="submit" class="boton-primario" @click="accionGuardar = 'recargar'">
          Guardar
        </button>
        <button type="submit" class="boton-primario" @click="accionGuardar = 'escenas'">
          Guardar y Editar escenas
        </button>
      </div>
    </section>

    <GeocontenidosLoaderModal v-bind="modal" @al-cerrar="modal.visible = false" />

    <ClientOnly>
      <SisdaiModal ref="modalStatus">
        <template #encabezado>
          <span v-if="estatusAlGuardar.cargando" />
          <h2 v-else>{{ estatusAlGuardar.estado ? 'Guardado con éxito' : 'Error' }}</h2>
        </template>

        <template #cuerpo>
          <GeocontenidosLoader
            v-if="estatusAlGuardar.cargando"
            :mensaje="estatusAlGuardar.textoCargando"
          />
          <p
            v-else-if="estatusAlGuardar.estado === false"
            class="alineacion-centrada"
            v-text="estatusAlGuardar.mensaje"
          />
          <p v-else class="alineacion-centrada">
            <span class="pictograma-aprobado pictograma-grande" />
          </p>
        </template>

        <template #pie>
          <button
            class="boton-secundario boton-chico"
            type="button"
            @click="modalStatus.cerrarModal()"
          >
            Cerrar
          </button>
        </template>
      </SisdaiModal>
    </ClientOnly>
  </form>
</template>

<style lang="scss" scoped>
.alineacion-centrada {
  display: flex !important;
  justify-content: center !important;
  text-align: center !important;
  width: 100% !important;
}
</style>
