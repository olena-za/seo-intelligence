import { Request } from 'express';

export type JwtUser = {
  sub: string;
  email: string;
};

export type AuthenticatedRequest = Request & {
  user: JwtUser;
};
