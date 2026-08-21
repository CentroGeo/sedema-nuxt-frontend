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
          estado="APROBADO"
          titulo="Descargas aprobadas"
          mensaje-vacio="Las descargas aprobadas aparecerán en esta sección."
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
</style>
