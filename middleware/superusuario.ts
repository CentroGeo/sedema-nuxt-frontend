export default defineNuxtRouteMiddleware(async () => {
  const { status } = useAuth();
  if (status.value !== 'authenticated') return navigateTo('/');

  const store = useAdministracionStore();
  try {
    await store.cargarPerfilActual();
  } catch {
    return navigateTo('/');
  }
  // Administradores sin permiso de gestión de módulos son redirigidos a permisos
  if (!store.perfilActual?.can_manage_modules) return navigateTo('/administracion/permisos');
});
