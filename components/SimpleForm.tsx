"use client";

import { FormEvent, useState, ReactNode } from "react";
import MarkdownEditor from "./MarkdownEditor";

interface Field {
  name: string;
  label: string;
  type: "text" | "textarea" | "markdown";
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  defaultValue?: string;
}

interface SimpleFormProps {
  fields: Field[];
  onSubmit: (data: Record<string, string>) => Promise<void>;
  submitText?: string;
  children?: ReactNode;
}

export default function SimpleForm({
  fields,
  onSubmit,
  submitText = "Submit",
  children,
}: SimpleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.defaultValue) {
        initial[field.name] = field.defaultValue;
      }
    });
    return initial;
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const data: Record<string, string> = {};

    fields.forEach((field) => {
      if (field.type === "markdown") {
        data[field.name] = fieldValues[field.name] || "";
      } else {
        data[field.name] = formData.get(field.name) as string;
      }
    });

    // Client-side validation
    for (const field of fields) {
      const value = field.type === "markdown" 
        ? fieldValues[field.name] || ""
        : (formData.get(field.name) as string) || "";
      
      if (field.required && !value.trim()) {
        setError(`${field.label} es requerido`);
        setIsSubmitting(false);
        return;
      }
      
      if (field.maxLength && value.length > field.maxLength) {
        setError(`${field.label} no puede exceder ${field.maxLength} caracteres`);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await onSubmit(data);
      // Reset form only if submission was successful
      if (formElement) {
        formElement.reset();
      }
      setFieldValues({});
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Error al enviar el formulario. Por favor intenta de nuevo.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      {fields.map((field) => (
        <div key={field.name}>
          <label
            htmlFor={field.name}
            className="block font-medium mb-1"
            style={{ color: "var(--foreground)", fontSize: "0.75rem" }}
          >
            {field.label}
            {field.required && (
              <span aria-label="requerido" style={{ color: "var(--error)" }}>
                {" "}
                *
              </span>
            )}
          </label>
          {field.type === "markdown" ? (
            <MarkdownEditor
              value={fieldValues[field.name] || ""}
              onChange={(value) =>
                setFieldValues((prev) => ({ ...prev, [field.name]: value }))
              }
              placeholder={field.placeholder}
              required={field.required}
              maxLength={field.maxLength}
            />
          ) : field.type === "textarea" ? (
            <textarea
              id={field.name}
              name={field.name}
              className="textarea"
              placeholder={field.placeholder}
              required={field.required}
              maxLength={field.maxLength}
              disabled={isSubmitting}
              defaultValue={field.defaultValue}
            />
          ) : (
            <input
              id={field.name}
              name={field.name}
              type="text"
              className="input"
              placeholder={field.placeholder}
              required={field.required}
              maxLength={field.maxLength}
              disabled={isSubmitting}
              defaultValue={field.defaultValue}
            />
          )}
        </div>
      ))}

      {error && (
        <div
          className="p-2 rounded border"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            color: "var(--error)",
            borderColor: "rgba(239, 68, 68, 0.3)",
            fontSize: "0.75rem",
          }}
        >
          <div className="flex items-start gap-1.5">
            <svg
              className="w-4 h-4 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Custom children (e.g., TagSelector) */}
      {children}

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        style={{ fontSize: "0.8125rem", padding: "0.375rem 0.75rem" }}
      >
        {isSubmitting ? "Enviando..." : submitText}
      </button>
    </form>
  );
}
