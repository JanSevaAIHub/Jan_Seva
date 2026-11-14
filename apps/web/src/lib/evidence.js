export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export function selectEvidence(files, current = [], existingCount = 0) {
  if (files.length + current.length + existingCount > 3) throw new Error('Choose at most three images per complaint.')
  return [...current, ...Array.from(files, file => {
    if (!IMAGE_TYPES.includes(file.type)) throw new Error('Choose JPEG, PNG or WebP images.')
    if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error('Each image must be nonempty and at most 5 MiB.')
    return { key: crypto.randomUUID(), file }
  })]
}
