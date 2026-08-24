<script setup>
import { generarPaletaPersonalizada } from '#shared/utils/generarPaletaSisdai';

// swatches para el selector; el color real lo pone sisdai-css vía data-perfil
const PERFILES = [
  {
    id: 'sigic',
    nombre: 'SIGIC',
    descripcion: 'Perfil actual de esta plataforma.',
    primario: '#9d2148',
    secundario: '#f5d4dd',
  },
  {
    id: 'predeterminada',
    nombre: 'Predeterminada (sisdai)',
    descripcion: 'Perfil base del sistema de diseño de CONAHCYT.',
    primario: '#3f17e4',
    secundario: '#dbd0fb',
  },
  {
    id: 'gema',
    nombre: 'GEMA',
    descripcion: 'Perfil del portal gema.conahcyt.mx.',
    primario: '#cc4b14',
    secundario: '#fdddcc',
  },
  {
    id: 'eni',
    nombre: 'ENI',
    descripcion: 'Perfil de Ecosistemas Nacionales Informáticos (ENI).',
    primario: '#0068ff',
    secundario: '#cce1ff',
  },
];

const { perfil, colorBase, actualizarEstilos } = useEstilosInstancia();
const { mostrarIdentidadGobMx, alternarIdentidadGobMx } = useIdentidadGobMx();

const guardandoPerfil = ref(null);
async function seleccionarPerfil(idPerfil) {
  if (idPerfil === perfil.value) return;
  guardandoPerfil.value = idPerfil;
  try {
    await actualizarEstilos({ perfil: idPerfil });
  } finally {
    guardandoPerfil.value = null;
  }
}

// perfil "personalizado": 1 color base, el resto se genera solo
const colorBaseBorrador = ref(colorBase.value || '#9D2148');
watch(colorBase, (valor) => {
  if (valor) colorBaseBorrador.value = valor;
});

const muestraSecundarioPersonalizado = computed(
  () => generarPaletaPersonalizada(colorBaseBorrador.value)['--color-secundario-4'] || '#EEEEEE'
);

async function aplicarPersonalizado() {
  guardandoPerfil.value = 'personalizado';
  try {
    await actualizarEstilos({ perfil: 'personalizado', colorBase: colorBaseBorrador.value });
  } finally {
    guardandoPerfil.value = null;
  }
}
</script>

<template>
  <div class="administracion-estilos-apariencia">
    <div class="tarjeta m-b-3">
      <div class="tarjeta-cuerpo">
        <h2 class="m-t-0">Gestión de estilos y apariencias</h2>
        <p class="texto-color-secundario m-0">
          Paleta de colores e identidad de Gobierno de México de esta instancia. Los cambios se
          aplican de inmediato para todas las personas visitantes.
        </p>
      </div>
    </div>

    <!-- ============ PALETA DE COLOR ============ -->
    <div class="tarjeta m-b-3">
      <div class="tarjeta-cuerpo">
        <h3 class="m-t-0">Paleta de color</h3>
        <p class="texto-color-secundario">
          Elige uno de los perfiles de color del sistema de diseño sisdai. Afecta botones,
          navegación, tablas y demás componentes en toda la plataforma.
        </p>

        <div class="perfiles-grid">
          <button
            v-for="p in PERFILES"
            :key="p.id"
            type="button"
            class="perfil-tarjeta"
            :class="{ 'perfil-tarjeta--activo': perfil === p.id }"
            :disabled="guardandoPerfil !== null"
            :aria-pressed="perfil === p.id"
            @click="seleccionarPerfil(p.id)"
          >
            <span class="perfil-tarjeta__muestras" aria-hidden="true">
              <span class="perfil-tarjeta__muestra" :style="{ backgroundColor: p.primario }" />
              <span class="perfil-tarjeta__muestra" :style="{ backgroundColor: p.secundario }" />
            </span>
            <span class="perfil-tarjeta__info">
              <strong>{{ p.nombre }}</strong>
              <span class="texto-color-secundario perfil-tarjeta__descripcion">{{
                p.descripcion
              }}</span>
            </span>
            <span v-if="perfil === p.id" class="pictograma-check-circulo" aria-hidden="true" />
            <span v-else-if="guardandoPerfil === p.id" class="texto-color-secundario">
              Aplicando…
            </span>
          </button>

          <div
            class="perfil-tarjeta perfil-tarjeta--personalizado"
            :class="{ 'perfil-tarjeta--activo': perfil === 'personalizado' }"
          >
            <span class="perfil-tarjeta__muestras" aria-hidden="true">
              <span
                class="perfil-tarjeta__muestra"
                :style="{ backgroundColor: colorBaseBorrador }"
              />
              <span
                class="perfil-tarjeta__muestra"
                :style="{ backgroundColor: muestraSecundarioPersonalizado }"
              />
            </span>
            <span class="perfil-tarjeta__info">
              <strong>
                Personalizado
                <span v-if="perfil === 'personalizado'" class="a11y-solo-lectura">
                  (perfil activo)</span
                >
              </strong>
              <span class="texto-color-secundario perfil-tarjeta__descripcion">
                Elige un color base; los demás tonos se generan automáticamente.
              </span>
              <label class="perfil-tarjeta__color-label">
                <input
                  v-model="colorBaseBorrador"
                  type="color"
                  :disabled="guardandoPerfil !== null"
                  aria-label="Color base del perfil personalizado"
                  @change="aplicarPersonalizado"
                />
                {{ colorBaseBorrador }}
              </label>
            </span>
            <span
              v-if="perfil === 'personalizado'"
              class="pictograma-check-circulo"
              aria-hidden="true"
            />
            <span v-else-if="guardandoPerfil === 'personalizado'" class="texto-color-secundario">
              Aplicando…
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ IDENTIDAD DE GOBIERNO DE MÉXICO ============ -->
    <div class="tarjeta">
      <div class="tarjeta-cuerpo">
        <h3 class="m-t-0">Identidad de Gobierno de México</h3>
        <p class="texto-color-secundario">
          Muestra u oculta la barra y el pie de página de identidad de Gobierno de México en todo el
          sitio.
        </p>
        <AdministracionSwitch
          :model-value="mostrarIdentidadGobMx"
          label-activo="Activada"
          label-inactivo="Desactivada"
          aria-label="Alternar identidad de Gobierno de México"
          @update:model-value="alternarIdentidadGobMx"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.perfiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.perfil-tarjeta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 2px solid var(--color-neutro-3, #bdbdbd);
  border-radius: 8px;
  background: var(--color-neutro-0, #fff);
  cursor: pointer;
  text-align: left;

  &:hover,
  &:focus-visible {
    border-color: var(--color-primario-2, #691c32);
  }

  &--activo {
    border-color: var(--color-primario-3, #691c32);
    box-shadow: 0 0 0 1px var(--color-primario-3, #691c32);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  &--personalizado {
    cursor: default;

    &:hover,
    &:focus-within {
      border-color: var(--color-primario-2, #691c32);
    }
  }
}

.perfil-tarjeta__color-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-family: monospace;
  font-size: 0.8rem;
  cursor: pointer;

  input[type='color'] {
    width: 28px;
    height: 22px;
    padding: 0;
    border: 1px solid var(--color-neutro-3, #bdbdbd);
    border-radius: 4px;
    cursor: pointer;
  }
}

.perfil-tarjeta__muestras {
  display: flex;
  flex: 0 0 auto;
  border-radius: 6px;
  overflow: hidden;
}

.perfil-tarjeta__muestra {
  width: 18px;
  height: 36px;
}

.perfil-tarjeta__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.perfil-tarjeta__descripcion {
  font-size: 0.8rem;
}
</style>
