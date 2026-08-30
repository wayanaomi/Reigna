/**
 * Shared shapes for service boundary results.
 *
 * `configured` distinguishes "this data source has no real records yet"
 * from "this data source isn't connected/reachable at all" — the two
 * empty states the product must tell apart (see /docs/DECISIONS.md).
 */
export interface ServiceListResult<T> {
  configured: boolean;
  items: T[];
  error?: string;
}

export function emptyUnconfigured<T>(): ServiceListResult<T> {
  return { configured: false, items: [] };
}

export function emptyError<T>(error: string): ServiceListResult<T> {
  return { configured: true, items: [], error };
}

export function ok<T>(items: T[]): ServiceListResult<T> {
  return { configured: true, items };
}
