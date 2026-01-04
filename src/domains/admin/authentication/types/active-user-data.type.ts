import { Roles } from '@core/types/roles.enum';

export type ActiveUserData = {
  sub: string;
  email: string;
  name: string;
  role: Roles;
};
