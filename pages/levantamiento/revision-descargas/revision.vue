<script setup>
definePageMeta({ middleware: 'auth' });
const store = useLevantamientoStore();
</script>
<template>
  <UiLayoutPaneles :estado-colapable="store.catalogoColapsado">
    <template #catalogo><LevantamientoListaMenuLateral /></template>
    <template #visualizador>
      <main id="principal" class="contenedor m-b-10 m-t-3">
        <LevantamientoMenuSecundario
          :opciones="[
            { texto: 'Aprobadas', ruta: '/levantamiento/revision-descargas' },
            { texto: 'Pendientes', ruta: '/levantamiento/revision-descargas/revision' },
            { texto: 'Rechazadas', ruta: '/levantamiento/revision-descargas/rechazadas' },
          ]"
        />
        <LevantamientoPanelDescargasAportes
          estado="NO REVISADO"
          titulo="Descargas de aportes pendientes"
          mensaje-vacio="No tienes solicitudes pendientes por revisar."
        />
      </main>
    </template>
  </UiLayoutPaneles>
</template>
