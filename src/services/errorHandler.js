import { v4 as uuidv4 } from 'uuid';

const ERROR_MAP = {
  'JWT': 'Authentication failed. Please sign in again.',
  'auth': 'Authentication failed. Please sign in again.',
  'NetworkError': 'Connection error. Please check your internet connection.',
  'fetch': 'Connection error. Please check your internet connection.',
  '401': 'You are not authorised to perform this action.',
  '403': 'You do not have permission to perform this action.',
  '404': 'The requested resource was not found.',
  '429': 'Too many requests. Please wait a moment and try again.',
  '500': 'A server error occurred. Please try again later.',
  'storage': 'File storage error. Please try again.',
  'duplicate': 'This record already exists.',
  'validation': 'Invalid data provided. Please check your input.',
};

const GENERIC_MESSAGE = 'An error occurred. Please try again or contact support.';

export class ErrorHandler {
  static handle(error, context = {}) {
    const errorId = uuidv4();

    // Log full error details internally only (never shown to user)
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[ErrorHandler] ${errorId}`, { error, context });
    }

    return {
      errorId,
      userMessage: this.getUserMessage(error),
    };
  }

  static getUserMessage(error) {
    const msg = error?.message || error?.error_description || String(error);
    const code = String(error?.status || error?.code || '');

    for (const [key, value] of Object.entries(ERROR_MAP)) {
      if (msg.includes(key) || code.includes(key)) return value;
    }

    return GENERIC_MESSAGE;
  }

  static sanitize(error) {
    return {
      code: error?.code,
      status: error?.status,
      type: error?.name || typeof error,
    };
  }
}
