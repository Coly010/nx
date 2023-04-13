import { convertNxExecutor } from '@nx/devkit';

import rollbackExecutor from './rollback.impl';

export default convertNxExecutor(rollbackExecutor);
