import { SetMetadata } from '@nestjs/common';

export const DEVELOPMENT_PUBLIC_ROUTE = 'developmentPublicRoute';

/**
 * Temporary local testing bypass.
 *
 * Revert later by removing this decorator from SERP debug routes and deleting
 * the metadata check in JwtAuthGuard.
 */
export const DevelopmentPublic = () =>
  SetMetadata(DEVELOPMENT_PUBLIC_ROUTE, true);
