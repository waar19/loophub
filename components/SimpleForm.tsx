"use client";

import { FormEvent, useState } from "react";
import MarkdownEditor from "./MarkdownEditor";

interface Field {
  name: string;
  label: string;
  type: "text" | "textarea" | "markdown";
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}

interface SimpleFormProps {
  fields: Field[];
  onSubmit: (data: Record<string, string>) => Promise<void>;
  submitText?: string;
}

export default function SimpleForm({
  fields,
  onSubmit,
  submitText = "Submit",
}: SimpleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};

    fields.forEach((field) => {
      if (field.type === "markdown") {
        data[field.name] = fieldValues[field.name] || "";
      } else {
        data[field.name] = formData.get(field.name) as string;
      }
    });

    try {
      await onSubmit(data);
      e.currentTarget.reset();
      setFieldValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit form");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name}>
          <label
            htmlFor={field.name}
            className="block text-sm font-medium mb-2"
          >
            {field.label}
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
            />
          )}
        </div>
      ))}

      {error && (
        <div
          className="p-3 rounded"
          style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}
        >
          {error}
        </div>
      )}

      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : submitText}
      </button>
    </form>
  );
}
