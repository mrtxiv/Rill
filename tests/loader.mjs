import { readFile } from 'node:fs/promises';
import ts from 'typescript';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    for (const suffix of ['.ts', '/index.ts']) {
      const url = new URL(specifier + suffix, context.parentURL);
      try {
        await readFile(url);
        return { url: url.href, shortCircuit: true };
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
      }
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts')) {
    const { outputText } = ts.transpileModule(await readFile(new URL(url), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    });
    return { format: 'module', source: outputText, shortCircuit: true };
  }
  if (url.endsWith('.sql') || url.endsWith('.bin')) {
    const contents = await readFile(new URL(url));
    const source = url.endsWith('.sql') ? JSON.stringify(contents.toString('utf8'))
      : `Uint8Array.from(${JSON.stringify([...contents])}).buffer`;
    return { format: 'module', source: `export default ${source}`, shortCircuit: true };
  }
  return nextLoad(url, context);
}
