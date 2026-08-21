/**
 * Utilidades para validar la completitud de los metadatos básicos de un recurso.
 *
 * La definición de "metadatos básicos" replica el filtro `complete_metadata`
 * del wrapper (sigic_geonode/sigic_resources/filters.py) y la validación del
 * wizard de metadatos (components/catalogo/BotonesMetadatos.vue): título,
 * fecha, tipo de fecha, categoría, palabras clave y atribución.
 * Mantener en paridad con el filtro del servidor.
 */

/** Placeholder que inyecta server/api/metadatos.post.ts cuando no hay atribución. */
export const ATTRIBUTION_PLACEHOLDER = 'No especificado';

export const MENSAJE_METADATOS_INCOMPLETOS = 'Completa los metadatos básicos para descargar';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Valida la categoría del recurso. Acepta el objeto del serializer
 * ({identifier, gn_description}) o una cadena. Los placeholders de catálogos
 * externos (identifier 'externalCatalog') cuentan como incompletos, igual que
 * en el filtro del servidor.
 * @param {Object|string|null} category
 * @returns {boolean}
 */
function hasCategory(category) {
  if (!category) {
    return false;
  }
  if (typeof category === 'string') {
    return category.trim().length > 0;
  }
  if (category.identifier === 'externalCatalog') {
    return false;
  }
  return isNonEmptyString(category.identifier) || isNonEmptyString(category.gn_description);
}

/**
 * Indica si un recurso tiene los metadatos básicos completos.
 * `date_type` solo se valida cuando la clave existe en el objeto: el
 * serializer corto (/api/v2/sigic-resources) no la expone y el filtro
 * `complete_metadata` del servidor ya la garantiza en los listados.
 * @param {Object} resource recurso de la API v2 (detalle o serializer corto)
 * @returns {boolean}
 */
export function hasBasicMetadata(resource) {
  if (!resource) {
    return false;
  }
  if (!isNonEmptyString(resource.title) || !isNonEmptyString(resource.date)) {
    return false;
  }
  if ('date_type' in resource && !isNonEmptyString(resource.date_type)) {
    return false;
  }
  if (!hasCategory(resource.category)) {
    return false;
  }
  if (!Array.isArray(resource.keywords) || resource.keywords.length === 0) {
    return false;
  }
  if (
    !isNonEmptyString(resource.attribution) ||
    resource.attribution.trim() === ATTRIBUTION_PLACEHOLDER
  ) {
    return false;
  }
  return true;
}

/**
 * Indica si se pueden descargar los metadatos XML (ISO 19139) de un recurso:
 * requiere uuid (consulta CSW GetRecordById), excluye recursos remotos y
 * exige los metadatos básicos completos.
 * @param {Object} resource
 * @returns {boolean}
 */
export function canDownloadMetadataXml(resource) {
  return (
    !!resource && resource.sourcetype !== 'REMOTE' && !!resource.uuid && hasBasicMetadata(resource)
  );
}
