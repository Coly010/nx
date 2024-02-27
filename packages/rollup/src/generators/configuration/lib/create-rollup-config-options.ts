import { RollupProjectSchema, RollupConfigOptions } from '../schema';
import {
  joinPathFragments,
  readProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import { RollupExecutorOptions } from '../../../executors/rollup/schema';
export function createRollupConfigOptions(
  tree: Tree,
  options: RollupProjectSchema,
  existingBuildOptions: RollupExecutorOptions
): RollupConfigOptions {
  const project = readProjectConfiguration(tree, options.project);

  return {
    main: options.main ?? joinPathFragments(project.sourceRoot, 'main.ts'),
    tsConfig:
      options.tsConfig ?? joinPathFragments(project.root, 'tsconfig.json'),
    projectName: project.name,
    projectRoot: project.root,
    sourceRoot: project.sourceRoot,
    assets: existingBuildOptions.assets,
    compiler: options.compiler ?? 'swc',
    format: options.format ?? ['cjs'],
    additionalEntryPoints: existingBuildOptions.additionalEntryPoints ?? [],
    extractCss: existingBuildOptions.extractCss,
    outputPath: existingBuildOptions.outputPath,
    outputFileName: existingBuildOptions.outputFileName,
    javascriptEnabled: existingBuildOptions.javascriptEnabled,
    pathToPackageJson: joinPathFragments(project.root, 'package.json'),
    skipTypeCheck: existingBuildOptions.skipTypeCheck,
    rollupConfig: joinPathFragments(project.root, 'rollup.config.js'),
  };
}
