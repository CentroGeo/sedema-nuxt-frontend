export default defineNuxtRouteMiddleware(async () => {
  const { status } = useAuth();

  if (status.value !== 'authenticated') {
    return navigateTo('/');
  }

  const store = useAdministracionStore();
  try {
    await store.cargarPerfilActual();
  } catch {
    return navigateTo('/');
  }

  if (!store.perfilActual?.can_access_administration) {
    return navigateTo('/');
  }
});
