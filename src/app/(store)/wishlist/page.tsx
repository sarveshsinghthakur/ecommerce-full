import type { Metadata } from "next";
import { WishlistGrid } from "@/components/wishlist/wishlist-grid";
import { SectionHeading } from "@/components/spatial";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Products you saved on this device at Loop Studio.",
};

export default function WishlistPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 lg:px-8 lg:py-14">
      <SectionHeading
        eyebrow="Saved for later"
        title="Your wishlist"
        description="Hearts you tap anywhere in the store collect here. The list lives in this browser, so it follows you between pages — but not between devices."
      />
      <div className="mt-8">
        <WishlistGrid />
      </div>
    </div>
  );
}
