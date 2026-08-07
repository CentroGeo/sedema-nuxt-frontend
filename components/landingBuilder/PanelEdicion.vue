<script setup>
const store = useLandingBuilderStore();

function manejarSeleccionLogo(archivo) {
  store.setLogoFile(archivo);
}
</script>

<template>
  <div class="panel-edicion">
    <section class="panel-edicion__tarjeta borde borde-redondeado-16 p-3 m-b-3">
      <h3 class="panel-edicion__titulo">Textos de portada</h3>
      <p class="panel-edicion__ayuda m-b-3">
        Nombre y mensajes principales que se muestran en la parte superior de la página.
      </p>

      <div class="m-b-3">
        <label for="landing-builder-nombre-plataforma">Nombre de la plataforma</label>
        <input
          id="landing-builder-nombre-plataforma"
          v-model="store.nombrePlataforma"
          type="text"
          placeholder="Ej. SIGIC"
          required
        />
      </div>

      <div class="m-b-3">
        <label for="landing-builder-titulo">Título</label>
        <input
          id="landing-builder-titulo"
          v-model="store.titulo"
          type="text"
          placeholder="Título principal de la portada"
          required
        />
      </div>

      <div>
        <label for="landing-builder-subtitulo">Subtítulo</label>
        <input
          id="landing-builder-subtitulo"
          v-model="store.subtitulo"
          type="text"
          placeholder="Subtítulo de la portada"
          required
        />
      </div>
    </section>

    <section class="panel-edicion__tarjeta borde borde-redondeado-16 p-3 m-b-3">
      <h3 class="panel-edicion__titulo">Sección informativa</h3>
      <p class="panel-edicion__ayuda m-b-3">
        Contenido que explica qué es la plataforma, debajo de la portada.
      </p>

      <div class="m-b-3">
        <label for="landing-builder-titulo-seccion">Encabezado de la sección</label>
        <input
          id="landing-builder-titulo-seccion"
          v-model="store.tituloSeccion"
          type="text"
          placeholder="Ej. ¿Qué es SIGIC?"
          required
        />
      </div>

      <div class="m-b-3">
        <label for="landing-builder-descripcion">Descripción</label>
        <textarea
          id="landing-builder-descripcion"
          v-model="store.descripcion"
          rows="4"
          placeholder="Descripción general de la plataforma"
          required
        />
      </div>

      <div>
        <label for="landing-builder-seccion-texto">Texto complementario</label>
        <textarea
          id="landing-builder-seccion-texto"
          v-model="store.seccionTexto"
          rows="4"
          placeholder="Texto adicional que acompaña a la descripción"
          required
        />
      </div>
    </section>

    <section class="panel-edicion__tarjeta borde borde-redondeado-16 p-3">
      <h3 class="panel-edicion__titulo">Logotipo</h3>
      <p class="panel-edicion__ayuda m-b-3">
        Imagen que se muestra junto al nombre de la plataforma.
      </p>

      <LandingBuilderCargaLogo
        :logo-url="store.logoUrl"
        label="Logo de la plataforma"
        @seleccionar-logo="manejarSeleccionLogo"
      />
    </section>
  </div>
</template>

<style scoped lang="scss">
.panel-edicion {
  &__titulo {
    margin: 0 0 4px;
  }

  &__ayuda {
    margin-top: 0;
    color: var(--texto-secundario);
    font-size: 0.875rem;
  }
}
</style>
