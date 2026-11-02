"use client";

import { PageHeader } from "@/components/ui/card";
import { ChatBox } from "@/components/admin/chat-box";

export default function AdminChatPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="AI Assistant"
        description="Ask the AI to create products, update details, or search the catalogue."
      />
      <ChatBox />
    </div>
  );
}