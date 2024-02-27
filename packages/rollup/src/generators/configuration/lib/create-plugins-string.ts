import { stripIndents, type Tree, workspaceRoot } from '@nx/devkit';
import { convertCopyAssetsToRollupOptions } from '../../../utils/convert-assets-to-rollup-options';
import { join } from 'path';
import { RollupConfigOptions } from '../schema';
export function createPluginsString(options: RollupConfigOptions) {
  const pluginImports = [];
  pluginImports.push(`import copy from 'rollup-plugin-copy';`);
  pluginImports.push(`import image from '@rollup/plugin-image';`);
  pluginImports.push(`import json from '@rollup/plugin-json';`);
  pluginImports.push(`import postcss from 'rollup-plugin-postcss';`);
  pluginImports.push(`import * as autoprefixer from 'autoprefixer';`);
  pluginImports.push(`import commonjs from '@rollup/plugin-commonjs';`);
  pluginImports.push(
    `import * as peerDepsExternal from 'rollup-plugin-peer-deps-external';`
  );
  pluginImports.push(`import nodeResolve from '@rollup/plugin-node-resolve';`);
  pluginImports.push(
    `import { analyze } from '@nx/rollup/src/executors/rollup/lib/analyze-plugin';`
  );

  const plugins = [];
  plugins.push(stripIndents`copy({
    targets: ${JSON.stringify(
      convertCopyAssetsToRollupOptions(options.outputPath, options.assets)
    )},
  })`);
  plugins.push(stripIndents`image()`);
  plugins.push(stripIndents`json()`);
  plugins.push(
    stripIndents`postcss({
    inject: true,
    extract: ${options.extractCss ?? false},
    autoModules: true,
    plugins: [autoprefixer],
    use: {
      less: {
        javascriptEnabled: ${options.javascriptEnabled ?? false}
      }
    }
  })`
  );
  plugins.push(stripIndents`nodeResolve({
    preferBuiltins: true,
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  })`);
  plugins.push(stripIndents`commonjs()`);
  plugins.push(stripIndents`peerDepsExternal({
    packageJsonPath: '${options.pathToPackageJson}'
  })`);
  plugins.push(stripIndents`analyze()`);

  const useBabel = options.compiler === 'babel';
  const useTsc = options.compiler === 'tsc';
  const useSwc = options.compiler === 'swc';
  const shouldBundleTypes =
    options.format.length === 1 || options.format.includes('cjs');

  if (useTsc || shouldBundleTypes) {
    pluginImports.push(`import typescript2 from 'rollup-plugin-typescript2'`);

    plugins.push(stripIndents`typescript2({
      check: ${!options.skipTypeCheck},
      tsconfig: '${options.tsConfig}'
    })`);
  }

  if (shouldBundleTypes) {
    pluginImports.push(
      `import { typeDefinitions } from '@nx/js/src/plugins/rollup/type-definitions';`
    );

    plugins.push(stripIndents`typeDefinitions({
      main: '${options.main}',
      projectRoot: '${options.projectRoot}'
    })`);
  }

  if (useSwc) {
    pluginImports.push(
      `import { swc } from '@nx/rollup/src/executors/lib/swc-plugin';`
    );

    plugins.push(stripIndents`swc()`);
  }

  if (useBabel) {
    pluginImports.push(
      `import { getBabelInputPlugin } from '@rollup/plugin-babel';`
    );

    plugins.push(stripIndents`getBabelInputPlugin({
      caller: {
        // @ts-ignore
        // Ignoring type checks for caller since we have custom attributes
        isNxPackage: true,
        supportsStaticESM: true,
        isModern: true
      },
      cwd: '${join(workspaceRoot, options.sourceRoot)}',
      babelrc: true,
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      babelHelpers: 'bundled',
      skipPreflightCheck: true,
      exclude: /node_modules/,
      plugins: ${
        options.format.includes('cjs')
          ? '[require.resolve("babel-plugin-transform-async-to-promises")]'
          : undefined
      }
    })`);
  }

  return {
    pluginImports: pluginImports.join('\n'),
    plugins: plugins.join(',\n'),
  };
}
