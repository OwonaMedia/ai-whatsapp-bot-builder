/**
 * Security Utilities
 * XSS Protection & Input Sanitization
 */

import DOMPurify from 'dompurify';

/**
 * Validate strong password requirements
 * - At least 8 characters
 * - Contains lowercase, uppercase, digit, and special character
 */
export function validateStrongPassword(password: string): boolean {
  if (typeof password !== 'string' || password.length < 8) {
    return false;
  }

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return hasLowercase && hasUppercase && hasDigit && hasSpecial;
}

const stripDangerousContent = (value: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    return '';
  }

  return value
    .replace(
      /<\s*(script|style|iframe|object|embed|link|meta)[^>]*>.*?<\s*\/\s*\1\s*>/gis,
      ''
    )
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '');
};

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof dirty !== 'string') {
    return '';
  }

  if (typeof window === 'undefined' || typeof DOMPurify === 'undefined') {
    // Server/edge environment: use string-based stripping as fallback
    return stripDangerousContent(dirty);
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });
}

/**
 * Sanitize user input (remove potentially dangerous characters)
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Validate phone number format (basic validation)
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m as keyof typeof map] || m);
}

/**
 * Generate CSRF token (simplified - in production use proper CSRF library)
 */
export function generateCsrfToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  
  // Generate random token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate URL to prevent open redirects
 */
export function validateUrl(url: string, allowedDomains: string[] = []): boolean {
  try {
    const parsedUrl = new URL(url);
    const defaultAllowed = ['whatsapp.owona.de', 'localhost'];
    const allAllowed = [...defaultAllowed, ...allowedDomains];
    
    return allAllowed.some((domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

