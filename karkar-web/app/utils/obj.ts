export function isDefined<T extends string | number | object | boolean>(
  o: T | undefined | null,
): o is T {
  return o !== undefined && o !== null
}
