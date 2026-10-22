/** Transport-agnostic application errors; the HTTP layer maps them to status codes. */
export class AppError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(message, 'NOT_FOUND'); }
}
export class ValidationError extends AppError {
  constructor(message: string) { super(message, 'VALIDATION'); }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(message, 'UNAUTHORIZED'); }
}
export class ConflictError extends AppError {
  constructor(message: string) { super(message, 'CONFLICT'); }
}
