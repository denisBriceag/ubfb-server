import { Request } from 'express';

export function getAccessToken(request: Request): string | undefined {
  const [_, token] = request.headers.authorization?.split(' ') ?? [];

  return token;
}
