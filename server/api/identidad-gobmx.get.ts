export default defineEventHandler(async () => {
  return { mostrarIdentidadGobMx: await getMostrarIdentidadGobMx() };
});
