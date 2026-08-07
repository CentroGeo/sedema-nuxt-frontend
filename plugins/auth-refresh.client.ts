// plugins/auth-refresh.client.ts

import { watch } from 'vue';

export default defineNuxtPlugin(() => {
  const { signOut, data } = useAuth();
  console.log('Auth refresh plugin loaded');

  watch(
    () => data.value?.error,
    (error) => {
      if (error === 'RefreshAccessTokenError') {
        signOut({
          callbackUrl: '/',
        });
      }
    },
    { immediate: true }
  );

  // Si la sesión activa cambia a otro usuario (p.ej. login en otra pestaña del mismo
  // navegador), recargamos la página para destruir todos los stores Pinia y evitar
  // que un usuario vea datos del otro.
  let initialEmail: string | null | undefined = undefined;
  watch(
    () => data.value?.user?.email,
    (newEmail) => {
      if (initialEmail === undefined) {
        initialEmail = newEmail;
        return;
      }
      if (initialEmail !== newEmail) {
        window.location.reload();
      }
    }
  );
});
