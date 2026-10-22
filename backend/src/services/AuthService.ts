import { ConflictError, UnauthorizedError } from '../domain/errors.js';
import type { Clock } from '../ports/Clock.js';
import type { PasswordHasher } from '../ports/PasswordHasher.js';
import type { SettingsRepository } from '../ports/SettingsRepository.js';
import type { TokenService } from '../ports/TokenService.js';
import type { UnitOfWork } from '../ports/UnitOfWork.js';
import type { UserRepository } from '../ports/UserRepository.js';

export interface AuthResult {
  userId: number;
  token: string;
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly settings: SettingsRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly clock: Clock,
    private readonly uow: UnitOfWork,
  ) {}

  async register(email: string, password: string, timeZone = 'UTC'): Promise<AuthResult> {
    const normalized = email.trim().toLowerCase();
    if (this.users.findByEmail(normalized)) throw new ConflictError('Email already registered');

    const passwordHash = await this.hasher.hash(password);
    const userId = this.uow.run(() => {
      const id = this.users.create(normalized, passwordHash);
      this.settings.initialize(id, this.clock.today(timeZone), timeZone);
      return id;
    });
    return { userId, token: this.tokens.issue(userId) };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = this.users.findByEmail(email.trim().toLowerCase());
    // Same error for unknown email and wrong password to avoid account enumeration.
    if (!user || !(await this.hasher.verify(password, user.passwordHash))) {
      throw new UnauthorizedError('Invalid email or password');
    }
    return { userId: user.userId, token: this.tokens.issue(user.userId) };
  }
}
