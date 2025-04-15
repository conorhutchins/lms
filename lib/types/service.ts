// Base error class for all service errors
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: ServiceErrorCode,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

// Define all possible error codes
export type ServiceErrorCode =
  // Generic service errors
  | 'NOT_FOUND'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR'
  // Auth specific errors
  | 'METHOD_NOT_ALLOWED'
  | 'INVALID_CODE'
  | 'OAUTH_ERROR'
  | 'EXCHANGE_ERROR'
  | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED'
  | 'SESSION_EXPIRED';

// Auth specific error class
export class AuthServiceError extends ServiceError {
  constructor(
    message: string,
    code: Extract<ServiceErrorCode, 
      | 'METHOD_NOT_ALLOWED'
      | 'INVALID_CODE'
      | 'OAUTH_ERROR'
      | 'EXCHANGE_ERROR'
      | 'INTERNAL_ERROR'
      | 'UNAUTHORIZED'
      | 'SESSION_EXPIRED'
    >,
    originalError?: unknown
  ) {
    super(message, code, originalError);
    this.name = 'AuthServiceError';
  }
}

// Simple service response type used across all services
export interface ServiceResponse<T, E extends ServiceError = ServiceError> {
  data: T | null;
  error: E | null;
} 