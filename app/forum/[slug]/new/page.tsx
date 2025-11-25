"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import SimpleForm from "@/components/SimpleForm";

export default function NewThreadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  const handleSubmit = async (data: Record<string, string>) => {
    const res = await fetch(`/api/forums/${slug}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create thread");
    }

    const thread = await res.json();
    router.push(`/thread/${thread.id}`);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Crear Nuevo Hilo</h1>

      <div className="card max-w-2xl">
        <SimpleForm
          fields={[
            {
              name: "title",
              label: "Título",
              type: "text",
              placeholder: "Escribe el título del hilo",
              required: true,
              maxLength: 200,
            },
            {
              name: "content",
              label: "Contenido",
              type: "markdown",
              placeholder: "Comparte tus pensamientos... (Markdown soportado)",
              required: true,
              maxLength: 10000,
            },
          ]}
          onSubmit={handleSubmit}
          submitText="Crear Hilo"
        />
      </div>
    </div>
  );
}
