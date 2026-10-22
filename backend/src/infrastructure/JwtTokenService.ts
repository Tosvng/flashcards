import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../domain/errors.js';
import type { TokenService } from '../ports/TokenService.js';

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  issue(userId: number): string {
    return jwt.sign({}, this.secret, { subject: String(userId), expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'], algorithm: 'HS256' });
  }

  verify(token: string): number {
    try {
      const payload = jwt.verify(token, this.secret, { algorithms: ['HS256'] });
      const userId = Number(typeof payload === 'string' ? NaN : payload.sub);
      if (!Number.isInteger(userId)) throw new Error('bad subject');
      return userId;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
}
