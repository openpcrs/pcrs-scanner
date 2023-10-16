export function sanitizePath(path) {
  return path.replaceAll(/\/\/+/g, '/')
}
