import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'apps/frontend/patient-app',
  'apps/frontend/psychologist-portal',
  'apps/backend/api',
  'apps/backend/worker',
  'packages/database',
]);
