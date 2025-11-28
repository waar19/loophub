import { describe, it, expect } from 'vitest';
import { validateUsername, validateEmail, validatePassword } from '@/lib/validations';

describe('Validations', () => {
  describe('validateUsername', () => {
    it('should accept valid usernames', () => {
      expect(validateUsername('john_doe')).toBe(true);
      expect(validateUsername('user123')).toBe(true);
      expect(validateUsername('Test_User_1')).toBe(true);
    });

    it('should reject usernames that are too short', () => {
      expect(validateUsername('ab')).toBe(false);
    });

    it('should reject usernames that are too long', () => {
      expect(validateUsername('a'.repeat(21))).toBe(false);
    });

    it('should reject usernames with special characters', () => {
      expect(validateUsername('user@name')).toBe(false);
      expect(validateUsername('user name')).toBe(false);
      expect(validateUsername('user.name')).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.org')).toBe(true);
      expect(validateEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      expect(validatePassword('Password123')).toBe(true);
      expect(validatePassword('MySecure!Pass1')).toBe(true);
    });

    it('should reject passwords that are too short', () => {
      expect(validatePassword('Pass1')).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      expect(validatePassword('PasswordOnly')).toBe(false);
    });

    it('should reject passwords without letters', () => {
      expect(validatePassword('123456789')).toBe(false);
    });
  });
});
