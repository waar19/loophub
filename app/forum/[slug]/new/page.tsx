"use client";

import { useRouter } from "next/navigation";
import SimpleForm from "@/components/SimpleForm";

export default function NewThreadPage({
  params,
}: {
  params: { slug: string };
}) {
  const router = useRouter();

  const handleSubmit = async (data: Record<string, string>) => {
    const res = await fetch(`/api/forums/${params.slug}/threads`, {
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
      <h1 className="text-3xl font-bold mb-8">Create New Thread</h1>

      <div className="card max-w-2xl">
        <SimpleForm
          fields={[
            {
              name: "title",
              label: "Title",
              type: "text",
              placeholder: "Enter thread title",
              required: true,
              maxLength: 200,
            },
            {
              name: "content",
              label: "Content",
              type: "textarea",
              placeholder: "Share your thoughts...",
              required: true,
              maxLength: 10000,
            },
          ]}
          onSubmit={handleSubmit}
          submitText="Create Thread"
        />
      </div>
    </div>
  );
}
