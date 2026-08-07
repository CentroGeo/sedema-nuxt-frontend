<script setup>
definePageMeta({ middleware: 'auth' });

const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { status } = useAuth();
const estaLogueado = computed(() => status.value === 'authenticated');

const panoramas = ref([]);
const estaCargando = ref(false);

async function cargarPanoramas() {
  estaCargando.value = true;
  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panoramas/`);

  const data = await respuesta.json();
  panoramas.value = data.results;
  estaCargando.value = false;
}
cargarPanoramas();

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const { data: userData } = useAuth();

async function eliminarPanorama(id) {
  await gnoxyFetch(`${config.public.geonodeApi}/panoramas/${id}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userData.value?.accessToken}` },
  });
  await cargarPanoramas();
}
</script>

<template>
  <div>
    <div>
      <h2>Bienvenido a Panoramas</h2>

      <p
        class="fondo-color-acento borde-redondeado-8 borde-l borde-grosor-4 p-4"
        style="border-color: var(--color-primario-4)"
      >
        Los Panoramas son visores tematicos de mapas con capas, marcadores y contenido narrativo
        asociado.
      </p>

      <NuxtLink
        v-if="estaLogueado"
        to="/geocontenidos/panoramas/nuevo/editar"
        class="boton boton-primario m-b-4"
      >
        <span class="pictograma-agregar m-r-1" />
        Crear Panorama
      </NuxtLink>
    </div>

    <GeocontenidosLoader v-if="estaCargando" />

    <div v-else-if="panoramas.length > 0" class="grid reticula-12">
      <div v-for="panorama in panoramas" :key="panorama.id" class="columna-8 columna-4-esc">
        <div class="tarjeta">
          <div class="tarjeta-cuerpo">
            <p class="tarjeta-titulo">{{ panorama.name }}</p>

            <p class="tarjeta-etiqueta">Creado: {{ formatearFecha(panorama.created_at) }}</p>
          </div>

          <div class="tarjeta-pie flex">
            <div class="fondo-color-acento borde borde-color-secundario borde-redondeado-8 m-t-2">
              <p class="m-1" style="display: flex; align-items: end; justify-content: center">
                <span class="pictograma-mapa-generador pictograma-mediano" />
                <span>
                  Tematicas: <b>{{ panorama.topic_count }}</b>
                </span>
              </p>
            </div>

            <p class="tarjeta-etiqueta m-0">
              {{ panorama.is_public ? 'Publico' : 'Privado' }}
            </p>

            <NuxtLink
              class="boton boton-chico boton-secundario"
              :to="`/panoramas/${panorama.id}`"
              target="_blank"
            >
              <span class="pictograma-ojo-ver m-r-1" />
              Ver
            </NuxtLink>

            <template v-if="estaLogueado">
              <NuxtLink
                class="boton boton-chico boton-secundario"
                :to="`/geocontenidos/panoramas/${panorama.id}/editar`"
              >
                <span class="pictograma-editar m-r-1" />
                Editar
              </NuxtLink>

              <NuxtLink
                class="boton boton-chico boton-secundario"
                :to="`/geocontenidos/panoramas/${panorama.id}/editar?tab=tematicas`"
              >
                <span class="pictograma-agregar m-r-1" />
                Temáticas
              </NuxtLink>

              <button
                class="boton boton-chico boton-primario"
                @click="eliminarPanorama(panorama.id)"
              >
                <span class="pictograma-eliminar m-r-1" />
                Eliminar
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="texto-centrado">
      <p class="h3">No hay panoramas disponibles.</p>
    </div>
  </div>
</template>
