import type { AuthGateway } from '../../application/ports/AuthGateway';
import type { AuthResult } from '../../domain/types';
import type { HttpClient } from '../http/HttpClient';

export class AuthApi implements AuthGateway {
  constructor(private readonly http: HttpClient) {}

  register(email: string, password: string, timeZone: string): Promise<AuthResult> {
    return this.http.post('/api/auth/register', { email, password, timeZone });
  }

  login(email: string, password: string): Promise<AuthResult> {
    return this.http.post('/api/auth/login', { email, password });
  }
}
