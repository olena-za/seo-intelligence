// Future auth integration: resolve authenticated user/workspace IDs here and
// pass them into services for tenant-scoped Prisma queries.
export type AuthContext = {
  userId?: string;
  workspaceId?: string;
};
