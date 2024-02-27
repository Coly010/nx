import { AssetGlobPattern } from '../../executors/rollup/schema';

export interface RollupProjectSchema {
  project: string;
  main?: string;
  tsConfig?: string;
  compiler?: 'babel' | 'swc' | 'tsc';
  skipFormat?: boolean;
  skipPackageJson?: boolean;
  skipValidation?: boolean;
  importPath?: string;
  external?: string[];
  rollupConfig?: string;
  buildTarget?: string;
  format?: ('cjs' | 'esm')[];
}

export interface RollupConfigOptions {
  projectName: string;
  main: string;
  outputPath: string;
  outputFileName: string;
  assets: AssetGlobPattern[];
  extractCss: string | boolean;
  javascriptEnabled: boolean;
  pathToPackageJson: string;
  compiler: 'babel' | 'swc' | 'tsc';
  projectRoot: string;
  sourceRoot: string;
  format: ('cjs' | 'esm')[];
  skipTypeCheck: boolean;
  tsConfig: string;
  additionalEntryPoints: string[];
  rollupConfig: string;
}
