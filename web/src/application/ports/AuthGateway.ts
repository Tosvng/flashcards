import type { AuthResult } from '../../domain/types';

export interface AuthGateway {
  register(email: string, password: string, timeZone: string): Promise<AuthResult>;
  login(email: string, password: string): Promise<AuthResult>;
}
