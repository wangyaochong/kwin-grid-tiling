import { pathToFileURL } from 'node:url';
import path from 'node:path';

const componentDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..', 'contents', 'component'
);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.mjs') && !specifier.includes('/') && !specifier.includes('\\')) {
    const resolved = pathToFileURL(path.join(componentDir, specifier)).href;
    return nextResolve(resolved, context);
  }
  return nextResolve(specifier, context);
}
