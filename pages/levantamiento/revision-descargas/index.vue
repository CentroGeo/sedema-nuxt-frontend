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
      <main id="principal" class="contenedor m-b-10 m-t-3">
        <LevantamientoMenuSecundario
          :opciones="[
            { texto: 'Aprobadas', ruta: '/levantamiento/revision-descargas' },
            {
              texto: 'Pendientes',
              ruta: '/levantamiento/revision-descargas/revision',
              notificacion: false,
            },
            {
              texto: 'Rechazadas',
              ruta: '/levantamiento/revision-descargas/rechazadas',
              notificacion: false,
            },
          ]"
        />

        <LevantamientoPanelDescargasAportes
          estado="APROBADO"
          titulo="Descargas de aportes aprobadas"
          mensaje-vacio="Las descargas de aportes aprobadas aparecerán en esta sección."
        />
      </main>
    </template>
  </UiLayoutPaneles>
</template>
