import { Roles } from '@core/types/roles.enum';

export enum TokenTypes {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

export type TokenSignature = {
  sub: string;
  name: string;
  email: string;
  role: Roles;
  jti: string;
  exp: number;
  typ: TokenTypes;
};

export type RefreshTokenSignature = Pick<TokenSignature, 'typ' | 'sub'> & {
  refreshTokenId: string;
};
