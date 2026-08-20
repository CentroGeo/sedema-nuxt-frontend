<script setup>
const props = defineProps({
  mapa: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['seleccionar', 'eliminar']);

const { data } = useAuth();
const storeCatalogo = useCatalogoStore();

const estaLogueado = computed(() => !!data.value);
const usuarioActual = computed(() => data.value?.user?.email);

const esSuperusuaria = computed(() => storeCatalogo.userInfo?.is_superuser || false);

const esDueno = computed(() => {
  if (!estaLogueado.value) return false;
  const owner = props.mapa.owner;
  return (
    owner?.username === usuarioActual.value ||
    owner?.username === storeCatalogo.userInfo?.username ||
    owner?.pk === storeCatalogo.userInfo?.pk
  );
});

const mostrarConfiguracion = computed(() => esSuperusuaria.value || esDueno.value);

onMounted(async () => {
  if (estaLogueado.value && !storeCatalogo.userInfo?.pk) {
    await storeCatalogo.getUserInfo();
  }
});

const tipoEtiqueta = {
  regular: 'Mapa simple',
  swipe: 'Comparativo',
  dual: 'Dual',
};

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
</script>

<template>
  <div class="tarjeta">
    <div class="tarjeta-cuerpo">
      <div
        class="fila-etiquetas-superiores flex flex-contenido-separado flex-alineado-centrado m-b-1"
      >
        <span class="etiqueta-compacta etiqueta-tipo">
          {{ tipoEtiqueta[mapa.map_type] || mapa.map_type }}
        </span>

        <span
          class="etiqueta-compacta etiqueta-estado"
          :class="mapa.is_public ? 'estado-publico' : 'estado-privado'"
        >
          <span
            :class="mapa.is_public ? 'pictograma-ojo-ver' : 'pictograma-privado'"
            class="m-r-1"
            aria-hidden="true"
          />
          {{ mapa.is_public ? 'Público' : 'Privado' }}
        </span>
      </div>

      <p class="tarjeta-titulo m-0 m-b-1">{{ mapa.name }}</p>

      <p class="tarjeta-etiqueta m-0 m-b-1 flex flex-alineado-centrado">
        <span class="pictograma-persona m-r-1" aria-hidden="true" />
        <span>{{ mapa.owner?.username || 'Anónimo' }}</span>
      </p>

      <p class="tarjeta-etiqueta m-0">
        Creado: {{ formatearFecha(mapa.created_at || mapa.created) }}
      </p>
    </div>

    <div class="tarjeta-pie flex">
      <div class="fondo-color-acento borde borde-color-secundario borde-redondeado-8 m-b-2">
        <p class="m-1" style="display: flex; align-items: end; justify-content: center">
          <span class="pictograma-mapa-generador pictograma-mediano m-r-1" />
          <span>
            Capas: <b>{{ mapa.layers_count ?? 0 }}</b>
          </span>
        </p>
      </div>

      <NuxtLink
        class="boton boton-chico boton-secundario"
        :to="`/mapas/${mapa.id}`"
        target="_blank"
      >
        <span class="pictograma-ojo-ver m-r-1" />
        Ver
      </NuxtLink>

      <template v-if="mostrarConfiguracion">
        <NuxtLink
          class="boton boton-chico boton-secundario"
          :to="`/geocontenidos/mapas/${mapa.id}`"
        >
          <span class="pictograma-editar m-r-1" />
          Editar
        </NuxtLink>

        <button
          class="boton boton-chico boton-primario"
          type="button"
          @click="emit('eliminar', mapa)"
        >
          <span class="pictograma-eliminar m-r-1" />
          Eliminar
        </button>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tarjeta {
  height: 100%;
  display: flex;
  flex-direction: column;

  &-cuerpo {
    padding: 12px 16px;
    background-color: var(--color-primario-4);
    color: var(--texto-inverso);

    .tarjeta-titulo {
      color: var(--texto-inverso);
      font-size: 1.1rem;
      line-height: 1.25;
      font-weight: 700;
    }

    .tarjeta-etiqueta {
      color: var(--texto-inverso);
      font-size: 0.85rem;
      line-height: 1.3;
    }
  }

  &-pie {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    padding: 16px;
    gap: 0.5rem;

    button,
    a {
      display: block;
      width: 100%;
      text-align: center;
    }
  }
}

.fila-etiquetas-superiores {
  min-height: 24px;
}

.etiqueta-compacta {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: max-content;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
  border-radius: 12px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.etiqueta-tipo {
  background-color: var(--color-secundario-2);
  color: var(--color-primario-4);
  border-color: var(--color-primario-4);
}

.estado-publico {
  background-color: var(--color-secundario-1);
  color: var(--color-primario-4);
  border-color: var(--color-primario-4);
}

.estado-privado {
  background-color: var(--color-neutro-2);
  color: var(--color-neutro-5);
  border-color: var(--color-neutro-4);
}
</style>
