/**
 * Formatea la fecha a la forma dd/mm/yyy 00:00 AM
 * @param date objeto tipo fecha a formatear
 * @returns {String}
 */
export function formatDate(date) {
  const formatter = ref();
  formatter.value = new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    // second: '2-digit',
  });
  const formattedTime = formatter.value.format(date);
  formatter.value = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short' });
  const formattedDate = formatter.value.format(date);
  return `${formattedDate} ${formattedTime}`;
}

export function tieneRolAdministrador(accessToken) {
  const role = 'levantamiento-admin';
  if (!accessToken) return false;

  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return false;

    // Normaliza Base64URL y padding para decodificar el payload con atob de forma segura
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(padded));
    const realmRoles = decoded?.realm_access?.roles || [];
    const clientRoles = Object.values(decoded?.resource_access || {}).flatMap(
      (resource) => resource?.roles || []
    );

    return [...realmRoles, ...clientRoles].includes(role);
  } catch {
    return false;
  }
}
