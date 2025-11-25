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

export type CreateForumInput = z.infer<typeof createForumSchema>;
export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
