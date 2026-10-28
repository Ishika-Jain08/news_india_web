export function slugify(input: string): string {
  const slug = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || 'story'
}
