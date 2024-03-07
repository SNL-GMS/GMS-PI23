import type { EntityReference, Faceted, VersionReference } from './types';
/**
 * Converts an objected that extends Faceted into a version reference
 *
 * @param value the object to be converted
 * @param key The faceting key of the object
 * @returns a version reference containing only the requested key and the effectiveAt field
 */
export function convertToVersionReference<
  K extends Exclude<keyof T, 'effectiveAt'>,
  T extends Faceted
>(value: T, key: K): VersionReference<K, T> {
  return { [key]: value[key], effectiveAt: value.effectiveAt } as VersionReference<K, T>;
}

/**
 * Converts an objected that extends Faceted into a entity reference
 *
 * @param value the object to be converted
 * @param key The faceting key of the object
 * @returns a entity reference containing only the requested key
 */
export function convertToEntityReference<K extends keyof T, T extends Faceted>(
  value: T,
  key: K
): EntityReference<K, T> {
  return { [key]: value[key] } as EntityReference<K, T>;
}
