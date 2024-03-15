import { type AssetGlobPattern } from '../executors/rollup/schema';
import { type OutputOptions, type Plugin } from 'rollup';
import {
  readCachedProjectGraph,
  readJsonFile,
  workspaceRoot,
} from '@nx/devkit';
import { dirname, join, relative, resolve } from 'path';
import * as autoprefixer from 'autoprefixer';
import * as peerDepsExternal from 'rollup-plugin-peer-deps-external';
import nodeResolve from '@rollup/plugin-node-resolve';
import { analyze } from '../executors/rollup/lib/analyze-plugin';
import { swc } from '../executors/rollup/lib/swc-plugin';
import { typeDefinitions } from '@nx/js/src/plugins/rollup/type-definitions';
import { getBabelInputPlugin } from '@rollup/plugin-babel';
import { findProjectForPath } from 'nx/src/devkit-internals';
import { createProjectRootMappings } from 'nx/src/project-graph/utils/find-project-for-path';

// These use require because the ES import isn't correct.
const commonjs = require('@rollup/plugin-commonjs');
const image = require('@rollup/plugin-image');
const json = require('@rollup/plugin-json');
const copy = require('rollup-plugin-copy');
const postcss = require('rollup-plugin-postcss');

interface RollupCopyAssetOption {
  src: string;
  dest: string;
}

export interface NxRollupPluginOptions {
  outDir: string;
  packageJsonPath: string;
  tsConfig: string;
  compiler?: 'swc' | 'tsc' | 'babel';
  babelUpwardRootMode?: boolean;
  deleteOutputPath?: boolean;
  external?: 'all' | undefined;
  extractCss?: boolean;
  assets?: AssetGlobPattern[];
  lessJavascriptEnabled?: boolean;
  generateExportsField?: boolean;
  additionalEntryPoints: string[];
  skipTypeCheck?: boolean;
  skipTypeField?: boolean;
}
export default function rollupPluginNx(
  rawOptions: NxRollupPluginOptions
): Plugin {
  const options = normalizeNxRollupOptions(rawOptions);
  const fileExtensions = ['.js', '.jsx', '.ts', '.tsx'];
  const absolutePathToPackageJson = resolve(
    process.cwd(),
    options.packageJsonPath
  );
  const packageJson = readJsonFile(absolutePathToPackageJson);
  const projectRoot = dirname(absolutePathToPackageJson);

  let graph, projectRootMappings, projectName, npmDeps;
  if (!global.NX_GRAPH_CREATION) {
    graph = readCachedProjectGraph();
    projectRootMappings = createProjectRootMappings(graph.nodes);
    projectName = findProjectForPath(
      relative(workspaceRoot, absolutePathToPackageJson),
      projectRootMappings
    );
    npmDeps = (graph.dependencies[projectName] ?? [])
      .filter((d) => d.target.startsWith('npm:'))
      .map((d) => d.target.slice(4));
  }

  const rollupPluginTypescript = require('rollup-plugin-typescript2')({
    check: !options.skipTypeCheck,
    tsconfig: options.tsConfig,
    tsconfigOverride: {
      compilerOptions: {
        ...(options.compiler === 'swc' ? { emitDeclarationOnly: true } : {}),
      },
    },
  });

  const nodeResolvePlugin = nodeResolve({
    preferBuiltins: true,
    extensions: fileExtensions,
  });

  const postcssPlugin = postcss({
    inject: true,
    extract: options.extractCss,
    autoModules: true,
    plugins: [autoprefixer],
    use: {
      less: {
        javascriptEnabled: options.lessJavascriptEnabled,
      },
    },
  });

  return {
    name: 'rollup-plugin-nx',
    options(inputOptions) {
      const withNxPlugins = [
        ...inputOptions.plugins,

        // INPUT AND OUTPUT HOOK
        postcssPlugin,
        nodeResolvePlugin,
        rollupPluginTypescript,
        // INPUT HOOK ONLY
        peerDepsExternal({
          packageJsonPath: absolutePathToPackageJson,
        }),
        image(),
        json(),
        copy({
          targets: convertCopyAssetsToRollupOptions(
            options.outDir,
            options.assets
          ),
        }),
        commonjs(),
      ];

      if (options.compiler === 'swc') {
        withNxPlugins.push(swc());
      } else if (options.compiler === 'babel') {
        withNxPlugins.push(
          getBabelInputPlugin({
            // Lets `@nx/js/babel` preset know that we are packaging.
            caller: {
              // @ts-ignore
              // Ignoring type checks for caller since we have custom attributes
              isNxPackage: true,
              // Always target esnext and let rollup handle cjs
              supportsStaticESM: true,
              isModern: true,
            },
            cwd: projectRoot,
            rootMode: options.babelUpwardRootMode ? 'upward' : undefined,
            babelrc: true,
            extensions: fileExtensions,
            babelHelpers: 'bundled',
            skipPreflightCheck: true, // pre-flight check may yield false positives and also slows down the build
            exclude: /node_modules/,
            plugins: [
              require.resolve('babel-plugin-transform-async-to-promises'),
            ].filter(Boolean),
          })
        );
      }

      let externalPackages = [];
      if (!global.NX_GRAPH_CREATION) {
        if (options.external === 'all') {
          externalPackages = [
            ...externalPackages,
            ...Object.keys(packageJson.dependencies || {}),
            ...Object.keys(packageJson.peerDependencies || {}),
            ...npmDeps,
          ];
        }
      }
      externalPackages = [...new Set(externalPackages)];

      return {
        ...inputOptions,
        plugins: withNxPlugins,
        external:
          options.external === 'all'
            ? (id: string) => {
                return externalPackages.some(
                  (name) => id === name || id.startsWith(`${name}/`)
                ); // Could be a deep import
              }
            : inputOptions.external,
      };
    },
    outputOptions(outputOptions): OutputOptions {
      const withNxOutputPlugins = [
        ...outputOptions.plugins,
        // OUTPUT HOOK ONLY
        analyze(),
        typeDefinitions({
          projectRoot,
        }),
        // INPUT AND OUTPUT HOOK
        postcssPlugin,
        nodeResolvePlugin,
        rollupPluginTypescript,
      ];

      const withNxOutputOptions = {
        ...outputOptions,
        plugins: withNxOutputPlugins,
      };

      return withNxOutputOptions;
    },
  };
}

function normalizeNxRollupOptions(
  rawOptions: NxRollupPluginOptions
): NxRollupPluginOptions {
  return {
    outDir: rawOptions.outDir,
    packageJsonPath: rawOptions.packageJsonPath,
    tsConfig: rawOptions.tsConfig,
    compiler: rawOptions.compiler ?? 'swc',
    babelUpwardRootMode: rawOptions.babelUpwardRootMode ?? false,
    deleteOutputPath: rawOptions.deleteOutputPath ?? true,
    external: rawOptions.external ?? undefined,
    extractCss: rawOptions.extractCss ?? true,
    assets: rawOptions.assets ?? [],
    lessJavascriptEnabled: rawOptions.lessJavascriptEnabled ?? false,
    generateExportsField: rawOptions.generateExportsField ?? false,
    additionalEntryPoints: rawOptions.additionalEntryPoints ?? undefined,
    skipTypeCheck: rawOptions.skipTypeCheck ?? false,
    skipTypeField: rawOptions.skipTypeField ?? false,
  };
}

function convertCopyAssetsToRollupOptions(
  outputPath: string,
  assets: AssetGlobPattern[]
): RollupCopyAssetOption[] {
  return assets
    ? assets.map((a) => ({
        src: join(a.input, a.glob).replace(/\\/g, '/'),
        dest: join(outputPath, a.output).replace(/\\/g, '/'),
      }))
    : undefined;
}

function updatePackageJson(
  packageJson: any,
  dependencies: string[],
  outputDirectory: string,
  options: NxRollupPluginOptions,
  formats: { esm: boolean; cjs: boolean }
) {
  if (options.generateExportsField) {
    packageJson.exports =
      typeof packageJson.exports === 'string' ? {} : { ...packageJson.exports };
    packageJson.exports['./package.json'] = './package.json';
  }
}
