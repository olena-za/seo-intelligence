export type Project = {
  id: string;
  name: string;
  domain: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
};

export type CreateProjectInput = {
  name: string;
  domain?: string;
  description?: string;
};
