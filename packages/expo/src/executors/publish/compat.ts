import { convertNxExecutor } from '@nx/devkit';

import publishExecutor from './publish.impl';

export default convertNxExecutor(publishExecutor);
