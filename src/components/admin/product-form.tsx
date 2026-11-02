"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/admin/upload-dropzone";
import { Input, Label, Textarea } from "@/components/ui/input";

export function ProductForm({ categories, initial }: { categories: Array<{ id: string; name: string }>, initial?: { id?: string; title?: string; description?: string; images?: string[]; brand?: string; categoryId?: string; sourcePrice?: string; markupPercent?: number; sellingPriceOverride?: string; referencePrice?: string; stockQuantity?: string; availability?: string; status?: string; rating?: number; reviewCount?: number; keywords?: string; seoTitle?: string; seoDescription?: string } | undefined }) {
  const [images, setImages] = useState(initial?.images || []);

  const handleUpload = (url: string) => {
    setImages([...images, url]);
  };

  return (
    <div className="grid gap-6">
      <PageHeader title={initial ? "Edit Product" : "New Product"} />
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Label>Title</Label>
          <Input defaultValue={initial?.title} />
          
          <Label>Category</Label>
          <select className="h-10 w-full rounded-md border p-2">
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          
          <Label>Description</Label>
          <Textarea defaultValue={initial?.description} />
        </div>

        <div className="space-y-4">
          <Label>Product Images</Label>
          <div className="flex flex-wrap gap-2 mb-4">
            {images.map((url: string, i: number) => (
              <img key={i} src={url} className="size-20 rounded border object-cover" />
            ))}
          </div>
          <UploadDropzone onUpload={handleUpload} />
          
          <Label>Or Paste URLs</Label>
          <Textarea defaultValue={images.join("\n")} onChange={(e) => setImages(e.target.value.split("\n"))} />
        </div>
      </div>

      <Button className="w-full">Save Product</Button>
    </div>
  );
}