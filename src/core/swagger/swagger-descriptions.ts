import { FEATURES } from '@core/constants';

export function getSwaggerOperations(
  feature: (typeof FEATURES)[keyof typeof FEATURES],
) {
  return {
    CREATE_NEW: `Create new ${feature}`,
    GET_ALL: `Get all ${feature}`,
    GET_ALL_WITH_PAG: `Get all ${feature} with pagination`,
    GET_BY_ID: `Get ${feature} by id`,
    UPDATE: `Update ${feature}`,
    UPDATE_BY_ID: `Update ${feature} by id`,
    RESTORE: `Restore ${feature}`,
    RESTORE_BY_ID: `Restore ${feature} by id`,
    SOFT_DELETE_BY_ID: `Soft delete ${feature} by id`,
    HARD_DELETE_BY_ID: `Hard delete ${feature} by id`,
  } as const;
}

export const SWAGGER_RES_DESCRIPTIONS = {
  UNAUTHORIZED: 'Unauthorized',
  INVALID_INPUT: 'Invalid input',
  NOT_FOUND: 'Resource not found',
  FORBIDDEN: (reason: string = '') =>
    'Forbidden.' + (reason ? ` Reason: ${reason}` : ''),
  CREATE_SUCCESS: 'Resource created successfully',
  GET_ALL_SUCCESS: 'Resources retrieved successfully',
  GET_BY_ID_SUCCESS: 'Resource retrieved successfully',
  UPDATE_SUCCESS: 'Resource updated successfully',
  RESTORED_SUCCESS: 'Resource restored successfully',
  SOFT_DELETE_SUCCESS: 'Resource soft deleted successfully',
  HARD_DELETE_SUCCESS: 'Resource hard deleted successfully',
} as const;

export const SWAGGER_CONSTANTS = {
  ACCESS_TOKEN: 'access-token',
} as const;
