// Transpile the real production modules, with no bundling or replacement logic.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../src/', import.meta.url))
const output = fileURLToPath(new URL('./.build/', import.meta.url))
const compilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  resolveJsonModule: true,
  inlineSourceMap: true,
  inlineSources: true,
}
const emitted = new Set()
rmSync(output, { recursive: true, force: true })
mkdirSync(output, { recursive: true })

function emitModule(source) {
  const sourcePath = relative(root, source)
  if (isAbsolute(sourcePath) || sourcePath.startsWith('..') || !/\.(ts|json)$/.test(sourcePath) || sourcePath.endsWith('.d.ts')) {
    throw new Error(`Unsupported production dependency: ${source}`)
  }
  const destination = resolve(output, sourcePath.replace(/\.ts$/, '.js'))
  if (emitted.has(source)) return destination
  emitted.add(source)
  mkdirSync(dirname(destination), { recursive: true })
  if (source.endsWith('.json')) {
    writeFileSync(destination, readFileSync(source))
    return destination
  }

  // Inspect emitted imports so erased type-only imports do not pull in the UI.
  const resolveImports = context => {
    const visit = node => {
      if ((ts.isExportDeclaration(node) && node.moduleSpecifier) ||
          (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)) {
        throw new Error(`Unsupported runtime dependency syntax in ${source}`)
      }
      if (!ts.isImportDeclaration(node) || !node.moduleSpecifier.text.startsWith('.')) {
        return ts.visitEachChild(node, visit, context)
      }
      const specifier = node.moduleSpecifier.text
      const dependency = ts.resolveModuleName(specifier, source, compilerOptions, ts.sys).resolvedModule
      if (!dependency) throw new Error(`Cannot resolve ${specifier} from ${source}`)
      const target = emitModule(resolve(dependency.resolvedFileName))
      const importPath = relative(dirname(destination), target).replaceAll('\\', '/')
      const attributes = target.endsWith('.json')
        ? ts.factory.createImportAttributes([ts.factory.createImportAttribute(ts.factory.createIdentifier('type'), ts.factory.createStringLiteral('json'))])
        : node.attributes
      return ts.factory.updateImportDeclaration(node, node.modifiers, node.importClause,
        ts.factory.createStringLiteral(importPath.startsWith('.') ? importPath : `./${importPath}`), attributes)
    }
    return file => ts.visitNode(file, visit)
  }
  const result = ts.transpileModule(readFileSync(source, 'utf8'), {
    fileName: source,
    compilerOptions,
    transformers: { after: [resolveImports] },
  })
  writeFileSync(destination, result.outputText)
  return destination
}
for (const name of ['essMode', 'setpointOverride', 'telemetry', 'controllerTelemetry']) {
  emitModule(resolve(root, `${name}.ts`))
}
