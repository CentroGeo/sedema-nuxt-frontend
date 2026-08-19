import { generarCssPerfilPersonalizado } from '#shared/utils/generarPaletaSisdai';

// pone data-perfil en <body> (server + cliente, sin flash) y si es
// personalizado inyecta el <style> con los tonos derivados del color base
export function useAplicarPerfilSisdai() {
  const { perfil, colorBase } = useEstilosInstancia();

  const cssPersonalizado = computed(() =>
    perfil.value === 'personalizado' ? generarCssPerfilPersonalizado(colorBase.value) : ''
  );

  useHead(() => ({
    bodyAttrs: { 'data-perfil': perfil.value },
    style: cssPersonalizado.value
      ? [{ key: 'estilos-perfil-personalizado', innerHTML: cssPersonalizado.value }]
      : [],
  }));

  return { perfil };
}
