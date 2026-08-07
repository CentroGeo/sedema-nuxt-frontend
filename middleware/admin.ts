export default defineNuxtRouteMiddleware(async () => {
  const { status } = useAuth();

  if (status.value !== 'authenticated') {
    return navigateTo('/');
  }

  const storeCatalogo = useCatalogoStore();

  if (!storeCatalogo.userInfo?.is_superuser) {
    await storeCatalogo.getUserInfo();
  }

  if (!storeCatalogo.userInfo?.is_superuser) {
    return navigateTo('/');
  }
});
