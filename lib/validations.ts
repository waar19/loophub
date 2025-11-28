import { z } from "zod";

// Spam prevention: limit text lengths
const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 10000;
const MAX_FORUM_NAME_LENGTH = 100;

export const createForumSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(MAX_FORUM_NAME_LENGTH, "Name too long"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
});

export const createThreadSchema = z.object({
  title: z
    .string()
    .min(1, "El título es requerido")
    .max(MAX_TITLE_LENGTH, `El título no puede exceder ${MAX_TITLE_LENGTH} caracteres`)
    .trim(),
  content: z
    .string()
    .min(1, "El contenido es requerido")
    .max(MAX_CONTENT_LENGTH, `El contenido no puede exceder ${MAX_CONTENT_LENGTH} caracteres`)
    .trim(),
});

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "El contenido es requerido")
    .max(MAX_CONTENT_LENGTH, `El contenido no puede exceder ${MAX_CONTENT_LENGTH} caracteres`)
    .trim(),
});

// Gamification schemas
export const superlikeSchema = z.object({
  thread_id: z.string().uuid("ID de thread inválido"),
});

export const hidePostSchema = z.object({
  thread_id: z.string().uuid("ID de thread inválido"),
});

export const markResourceSchema = z.object({
  thread_id: z.string().uuid("ID de thread inválido"),
});

export type CreateForumInput = z.infer<typeof createForumSchema>;
export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type SuperlikeInput = z.infer<typeof superlikeSchema>;
export type HidePostInput = z.infer<typeof hidePostSchema>;
export type MarkResourceInput = z.infer<typeof markResourceSchema>;

// Utility validation functions
export function validateUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): boolean {
  // At least 8 characters, with at least one letter and one number
  const minLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return minLength && hasLetter && hasNumber;
}

export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
