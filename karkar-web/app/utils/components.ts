export function cx(candidates: Record<string, boolean>): string {
  const names: string[] = []
  for (const [name, val] of Object.entries(candidates)) {
    if (val) names.push(name)
  }
  return names.join(" ")
}
