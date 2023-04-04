import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from 'nx/src/generators/tree';
import { readJson } from 'nx/src/generators/utils/json';
import replacePackage from './update-16-0-0-add-nx-packages';

describe('update-16-0-0-add-nx-packages', () => {
  let tree: Tree;
  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should remove the dependency on @nrwl/devkit', async () => {
    await replacePackage(tree);

    expect(
      readJson(tree, 'package.json').dependencies['@nrwl/devkit']
    ).not.toBeDefined();
    expect(
      readJson(tree, 'package.json').devDependencies['@nrwl/devkit']
    ).not.toBeDefined();
  });
});
