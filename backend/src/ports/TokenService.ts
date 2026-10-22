export interface TokenService {
  issue(userId: number): string;
  /** Returns the userId, or throws UnauthorizedError. */
  verify(token: string): number;
}
