export function stringOrDefault(
  s: string | null | undefined,
  dflt: string,
): string {
  if (isStringNotEmpty(s)) return s
  return dflt
}

export function isStringEmpty(s: string | null | undefined): boolean {
  return !s || s.trim().length === 0
}

export function isStringNotEmpty(s: string | null | undefined): s is string {
  return !isStringEmpty(s)
}
