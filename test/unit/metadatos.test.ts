import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTION_PLACEHOLDER,
  canDownloadMetadataXml,
  hasBasicMetadata,
} from '../../utils/metadatos';

/** Recurso como lo devuelve el detalle de la API v2 (datasets/{pk}). */
function recursoDetalle(overrides = {}) {
  return {
    pk: 1,
    uuid: 'abc-123',
    title: 'Capa de prueba',
    date: '2026-01-01T00:00:00Z',
    date_type: 'creation',
    category: { identifier: 'environment', gn_description: 'Environment' },
    keywords: [{ name: 'agua' }],
    attribution: 'CentroGeo',
    sourcetype: 'LOCAL',
    ...overrides,
  };
}

/** Recurso como lo devuelve el serializer corto (/api/v2/sigic-resources): sin date_type. */
function recursoCorto(overrides = {}) {
  const { date_type: _omitido, ...base } = recursoDetalle();
  return { ...base, ...overrides };
}

describe('hasBasicMetadata', () => {
  it('acepta un recurso de detalle con los básicos completos', () => {
    expect(hasBasicMetadata(recursoDetalle())).toBe(true);
  });

  it('acepta el serializer corto sin la clave date_type', () => {
    const recurso = recursoCorto();
    expect('date_type' in recurso).toBe(false);
    expect(hasBasicMetadata(recurso)).toBe(true);
  });

  it('rechaza date_type vacío cuando la clave sí existe', () => {
    expect(hasBasicMetadata(recursoDetalle({ date_type: '' }))).toBe(false);
  });

  it('rechaza recursos nulos o vacíos', () => {
    expect(hasBasicMetadata(null)).toBe(false);
    expect(hasBasicMetadata(undefined)).toBe(false);
    expect(hasBasicMetadata({})).toBe(false);
  });

  it('rechaza título o fecha vacíos', () => {
    expect(hasBasicMetadata(recursoDetalle({ title: '  ' }))).toBe(false);
    expect(hasBasicMetadata(recursoDetalle({ date: null }))).toBe(false);
  });

  it('rechaza la atribución placeholder del servidor', () => {
    expect(hasBasicMetadata(recursoDetalle({ attribution: ATTRIBUTION_PLACEHOLDER }))).toBe(false);
    expect(hasBasicMetadata(recursoDetalle({ attribution: '' }))).toBe(false);
    expect(hasBasicMetadata(recursoDetalle({ attribution: null }))).toBe(false);
  });

  it('rechaza keywords vacías o ausentes', () => {
    expect(hasBasicMetadata(recursoDetalle({ keywords: [] }))).toBe(false);
    expect(hasBasicMetadata(recursoDetalle({ keywords: null }))).toBe(false);
  });

  it('rechaza categoría nula o de catálogo externo', () => {
    expect(hasBasicMetadata(recursoDetalle({ category: null }))).toBe(false);
    expect(hasBasicMetadata(recursoDetalle({ category: { identifier: 'externalCatalog' } }))).toBe(
      false
    );
  });

  it('acepta categoría como cadena no vacía', () => {
    expect(hasBasicMetadata(recursoDetalle({ category: 'Medio ambiente' }))).toBe(true);
    expect(hasBasicMetadata(recursoDetalle({ category: '' }))).toBe(false);
  });
});

describe('canDownloadMetadataXml', () => {
  it('permite descargar un recurso local completo con uuid', () => {
    expect(canDownloadMetadataXml(recursoDetalle())).toBe(true);
    expect(canDownloadMetadataXml(recursoCorto())).toBe(true);
  });

  it('bloquea recursos remotos', () => {
    expect(canDownloadMetadataXml(recursoDetalle({ sourcetype: 'REMOTE' }))).toBe(false);
  });

  it('bloquea recursos sin uuid', () => {
    expect(canDownloadMetadataXml(recursoDetalle({ uuid: null }))).toBe(false);
    expect(canDownloadMetadataXml(recursoDetalle({ uuid: '' }))).toBe(false);
  });

  it('bloquea recursos sin metadatos básicos', () => {
    expect(canDownloadMetadataXml(recursoDetalle({ keywords: [] }))).toBe(false);
    expect(canDownloadMetadataXml(null)).toBe(false);
  });
});
