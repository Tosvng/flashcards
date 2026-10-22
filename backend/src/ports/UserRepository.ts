export interface UserRecord {
  userId: number;
  email: string;
  passwordHash: string;
}

export interface UserRepository {
  findByEmail(email: string): UserRecord | null;
  /** Throws ConflictError if the email is taken. */
  create(email: string, passwordHash: string): number;
}
