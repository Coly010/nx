import { convertNxExecutor } from '@nx/devkit';

import publishSetExecutor from './publish-set.impl';

export default convertNxExecutor(publishSetExecutor);
