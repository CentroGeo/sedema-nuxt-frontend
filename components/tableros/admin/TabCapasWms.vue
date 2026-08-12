<script setup>
const capasWms = ref([]);
const capaEnEdicion = ref(null);
const formularioVersion = ref(0);

const valoresIniciales = computed(() => capaEnEdicion.value || {});

function guardarTemporal(datos) {
  if (capaEnEdicion.value) {
    const indice = capasWms.value.findIndex((capa) => capa.id === capaEnEdicion.value.id);

    if (indice !== -1) {
      const capaActual = capasWms.value[indice];

      capasWms.value[indice] = {
        ...capaActual,
        ...datos,
        at_start: Boolean(capaActual.at_start),
      };
    }
  } else {
    capasWms.value.push({
      id: `wms-temporal-${Date.now()}`,
      ...datos,
      at_start: false,
    });
  }

  capaEnEdicion.value = null;
  formularioVersion.value += 1;
}

function editarCapa(capa) {
  capaEnEdicion.value = { ...capa };
}

function alternarVisibilidad(id) {
  capasWms.value = capasWms.value.map((capa) =>
    capa.id === id
      ? {
          ...capa,
          at_start: !capa.at_start,
        }
      : capa
  );
}

function eliminarCapa(id) {
  capasWms.value = capasWms.value.filter((capa) => capa.id !== id);

  if (capaEnEdicion.value?.id === id) {
    cancelarEdicion();
  }
}

function cancelarEdicion() {
  capaEnEdicion.value = null;
  formularioVersion.value += 1;
}
</script>

<template>
  <section class="tab-capas-wms">
    <div class="tab-capas-wms__aviso" role="status">
      Esta es una vista de prueba. Las capas agregadas todavía no se guardan al recargar la página.
    </div>

    <div class="tab-capas-wms__columnas">
      <section class="panel-wms panel-wms--listado">
        <header class="panel-wms__encabezado">
          <div>
            <h3>Capas WMS agregadas</h3>
            <p>Administra los servicios externos disponibles en este tablero.</p>
          </div>

          <span class="panel-wms__contador">
            {{ capasWms.length }}
          </span>
        </header>

        <div v-if="capasWms.length === 0" class="estado-vacio">
          <span class="pictograma-capas estado-vacio__icono" aria-hidden="true" />

          <h4>No hay capas WMS agregadas</h4>

          <p>
            Completa el formulario para agregar una capa y visualizar cómo aparecerá en este
            listado.
          </p>
        </div>

        <div v-else class="lista-wms">
          <article v-for="capa in capasWms" :key="capa.id" class="tarjeta-wms">
            <header class="tarjeta-wms__encabezado">
              <h4>{{ capa.name }}</h4>

              <button
                type="button"
                class="tarjeta-wms__estado"
                :class="{ 'tarjeta-wms__estado--activo': capa.at_start }"
                :aria-pressed="capa.at_start"
                :aria-label="`${capa.at_start ? 'Desactivar' : 'Activar'} la capa ${capa.name}`"
                @click="alternarVisibilidad(capa.id)"
              >
                {{ capa.at_start ? 'Activa' : 'Inactiva' }}
              </button>
            </header>

            <div class="tarjeta-wms__contenido">
              <p v-if="capa.wms_layers" class="tarjeta-wms__dato">
                <strong>Capa:</strong>
                {{ capa.wms_layers }}
              </p>

              <p class="tarjeta-wms__url" :title="capa.url">
                {{ capa.url }}
              </p>

              <p class="tarjeta-wms__tipo">
                {{
                  capa.wms_or_tile === 'tile'
                    ? 'Tile (XYZ)'
                    : capa.wms_version
                      ? `WMS ${capa.wms_version}`
                      : 'WMS'
                }}
                <template v-if="capa.attribution"> · {{ capa.attribution }}</template>
              </p>
            </div>

            <footer class="tarjeta-wms__acciones">
              <button
                type="button"
                class="boton boton-secundario boton-chico"
                @click="editarCapa(capa)"
              >
                <span class="pictograma-editar m-r-1" aria-hidden="true" />
                Editar
              </button>

              <button
                type="button"
                class="boton boton-secundario boton-chico texto-color-error"
                @click="eliminarCapa(capa.id)"
              >
                <span class="pictograma-eliminar m-r-1" aria-hidden="true" />
                Eliminar
              </button>
            </footer>
          </article>
        </div>
      </section>

      <section class="panel-wms panel-wms--formulario">
        <header class="panel-wms__encabezado">
          <div>
            <h3>{{ capaEnEdicion ? 'Editar capa WMS' : 'Agregar capa WMS' }}</h3>
            <p>
              {{
                capaEnEdicion
                  ? 'Modifica la configuración de la capa seleccionada.'
                  : 'Ingresa los datos del servicio externo.'
              }}
            </p>
          </div>
        </header>

        <GeocontenidosWmsFormularioWms
          :key="formularioVersion"
          :valores-iniciales="valoresIniciales"
          :mostrar-control-inicio="false"
          permitir-consulta-capas
          @guardar="guardarTemporal"
          @cancelar="cancelarEdicion"
        />
      </section>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.tab-capas-wms {
  width: 100%;
}

.tab-capas-wms__aviso {
  margin-bottom: 16px;
  padding: 10px 14px;
  border-left: 4px solid var(--color-primario-4);
  background-color: var(--fondo-acento);
  font-size: 0.875rem;
}

.tab-capas-wms__columnas {
  display: grid;
  grid-template-columns: minmax(280px, 2fr) minmax(360px, 3fr);
  gap: 24px;
  align-items: start;
}

.panel-wms {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--color-neutro-1);
  border-radius: 8px;
  background-color: var(--fondo);
}

.panel-wms__encabezado {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.panel-wms__encabezado h3,
.panel-wms__encabezado p {
  margin: 0;
}

.panel-wms__encabezado p {
  margin-top: 4px;
  color: var(--texto-secundario);
  font-size: 0.875rem;
}

.panel-wms__contador {
  display: inline-flex;
  min-width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: var(--color-primario-4);
  color: var(--texto-inverso);
  font-weight: 700;
}

.estado-vacio {
  display: flex;
  min-height: 260px;
  padding: 28px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--color-neutro-1);
  border-radius: 8px;
  text-align: center;
}

.estado-vacio__icono {
  margin-bottom: 12px;
  font-size: 2.5rem;
  opacity: 0.6;
}

.estado-vacio h4 {
  margin: 0 0 8px;
}

.estado-vacio p {
  max-width: 360px;
  margin: 0;
  color: var(--texto-secundario);
}

.lista-wms {
  display: flex;
  max-height: 560px;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.tarjeta-wms {
  overflow: hidden;
  border: 1px solid var(--color-neutro-1);
  border-radius: 8px;
  background-color: var(--fondo-acento);
}

.tarjeta-wms__encabezado {
  display: flex;
  padding: 10px 12px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background-color: var(--color-primario-4);
  color: var(--texto-inverso);
}

.tarjeta-wms__encabezado h4 {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 1rem;
}

.tarjeta-wms__estado {
  flex: 0 0 auto;
  padding: 3px 8px;
  border-radius: 999px;
  background-color: var(--color-neutro-3);
  color: var(--texto);
  font-size: 0.75rem;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
}

.tarjeta-wms__estado--activo {
  background-color: #d8f3dc;
  color: #1b5e20;
}

.tarjeta-wms__estado:hover {
  border-color: currentcolor;
}

.tarjeta-wms__estado:focus-visible {
  outline: 2px solid var(--texto-inverso);
  outline-offset: 2px;
}

.tarjeta-wms__contenido {
  padding: 12px;
}

.tarjeta-wms__dato,
.tarjeta-wms__url,
.tarjeta-wms__tipo {
  margin: 0;
  overflow-wrap: anywhere;
}

.tarjeta-wms__url {
  margin-top: 6px;
  font-size: 0.75rem;
}

.tarjeta-wms__tipo {
  margin-top: 8px;
  color: var(--texto-secundario);
  font-size: 0.75rem;
}

.tarjeta-wms__acciones {
  display: flex;
  padding: 8px 10px;
  justify-content: flex-end;
  gap: 6px;
  border-top: 1px solid var(--color-neutro-1);
}

@media (max-width: 920px) {
  .tab-capas-wms__columnas {
    grid-template-columns: 1fr;
  }

  .panel-wms--formulario {
    grid-row: 1;
  }

  .panel-wms--listado {
    grid-row: 2;
  }
}
</style>
