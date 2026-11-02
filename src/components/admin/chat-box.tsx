"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  productPreview?: any;
}

export function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleCreateProduct = async (preview: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preview),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: `Success! Product "${data.product.title}" created. ID: ${data.product.id}` }]);
      } else {
        throw new Error(data.error || "Failed to create product");
      }
    } catch (err) {
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Creation failed"}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Detect URLs in the message — bypass the AI for product imports.
      // Mistral's free tier is 5 req/min, so the admin shouldn't be blocked
      // from importing just because the AI is rate-limited.
      const urlMatch = input.match(/https?:\/\/\S+/i);
      if (urlMatch) {
        const url = urlMatch[0];
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: `Importing product from ${url}...` }]);
        
        const importRes = await fetch("/api/admin/products/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const importData = await importRes.json();

        if (importData.preview) {
          setMessages((prev) => [...prev, { 
            id: Date.now().toString(), 
            role: "assistant", 
            content: `I've imported the details for "${importData.preview.title}". Should I create this product?`,
            productPreview: importData.preview
          }]);
        } else {
          setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: `Import failed: ${importData.error || "No data found."}` }]);
        }
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, sessionId: "new" }),
      });
      const data = await response.json();
      
      if (data.content) {
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: data.content }]);
      }
      
      if (data.toolCalls && data.toolCalls.length > 0) {
        for (const toolCall of data.toolCalls) {
          const { name, arguments: args } = toolCall.function;
          const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
          
          if (name === "importProduct") {
            setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: `Scraping details from ${parsedArgs.url}...` }]);
            
            const importRes = await fetch("/api/admin/products/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: parsedArgs.url }),
            });
            const importData = await importRes.json();

            if (importData.preview) {
              setMessages((prev) => [...prev, { 
                id: Date.now().toString(), 
                role: "assistant", 
                content: `I've imported the details for "${importData.preview.title}". Should I create this product?`,
                productPreview: importData.preview
              }]);
            } else {
              setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: `Scraping failed: ${importData.error || "No data found."}` }]);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: "Error: AI assistant is currently unavailable." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] shadow-xl border-[var(--color-border-strong)]">
      <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
            <div className={cn("p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed", 
              msg.role === "user" 
                ? "bg-[var(--color-primary)] text-white shadow-md rounded-tr-none" 
                : "bg-[var(--color-muted)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-tl-none")}>
              {msg.content}
              
              {msg.productPreview && (
                <div className="mt-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border-strong)] rounded-xl space-y-3 shadow-inner">
                  <div className="flex gap-3">
                    {msg.productPreview.images?.[0] && (
                      <img src={msg.productPreview.images[0]} className="size-16 rounded-md object-cover border" alt="" />
                    )}
                    <div>
                      <div className="font-bold text-sm line-clamp-1">{msg.productPreview.title}</div>
                      <div className="text-xs text-[var(--color-muted-foreground)]">{msg.productPreview.brand}</div>
                      <div className="text-sm font-semibold mt-1">₹{msg.productPreview.sourcePrice || msg.productPreview.referencePrice}</div>
                    </div>
                  </div>
                  <Button size="sm" fullWidth onClick={() => handleCreateProduct(msg.productPreview)}>
                    Confirm & Create Product
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--color-muted)] p-3 rounded-xl rounded-tl-none border border-[var(--color-border)]">
              <Loader2 className="animate-spin size-5 text-[var(--color-muted-foreground)]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <form onSubmit={handleSubmit} className="p-4 border-t bg-[var(--color-surface)] flex gap-2 rounded-b-[var(--radius-card)]">
        <Input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Paste a Meesho/Amazon link or type details..." 
          className="bg-[var(--color-muted)] border-none focus:ring-1"
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={loading} className="shrink-0">
          <Send className="size-4" />
        </Button>
      </form>
    </Card>
  );
}