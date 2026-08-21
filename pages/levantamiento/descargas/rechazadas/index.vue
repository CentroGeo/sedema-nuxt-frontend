<script setup>
definePageMeta({
  middleware: 'auth',
});
const storeLevantamiento = useLevantamientoStore();
</script>
<template>
  <UiLayoutPaneles :estado-colapable="storeLevantamiento.catalogoColapsado">
    <template #catalogo>
      <LevantamientoListaMenuLateral />
    </template>

    <template #visualizador>
      <main id="principal" class="principal-levantamiento flex contenedor m-b-10 m-t-3">
        <LevantamientoMenuSecundario
          :opciones="[
            { texto: 'Aprobadas', ruta: '/levantamiento/descargas', notificacion: false },
            {
              texto: 'En revisión',
              ruta: '/levantamiento/descargas/revision',
              notificacion: false,
            },
            {
              texto: 'Rechazadas',
              ruta: '/levantamiento/descargas/rechazadas',
              notificacion: false,
            },
          ]"
        />

        <LevantamientoPanelDescargasUsuario
          estado="RECHAZADO"
          titulo="Descargas rechazadas"
          mensaje-vacio="Las solicitudes rechazadas aparecerán en esta sección."
        />
      </main>
    </template>
  </UiLayoutPaneles>
</template>
<style lang="scss" scoped>
.principal-levantamiento {
  flex-direction: column;
  gap: 0;
}

.titulo-contenido-levantamiento {
  align-items: center;
}

.contenido-levantamiento {
  flex: 1;
  align-items: center;
}

.encabezado-descarga {
  p {
    align-self: flex-start;
  }
}

.nombre-proyecto {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 22.5px;
  min-height: calc(22.5px * 3);
}

.acciones-descarga {
  button {
    width: 100%;
    justify-content: center;
  }
}
</style>
