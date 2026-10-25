// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

afterEach(cleanup);

describe("resilient product images", () => {
  it("uses a local placeholder instead of an unrelated remote product on failure", () => {
    const { getByRole } = render(createElement(ImageWithFallback, { src: "https://cdn.example/item.jpg", alt: "Shoes" }));
    fireEvent.error(getByRole("img"));
    expect(getByRole("img").getAttribute("src")).toBe("/images/product-placeholder.svg");
  });
  it("retries a new source after the previous image failed", () => {
    const { getByRole, rerender } = render(createElement(ImageWithFallback, { src: "/old.jpg", alt: "Product" }));
    fireEvent.error(getByRole("img"));
    rerender(createElement(ImageWithFallback, { src: "/new.jpg", alt: "Product" }));
    expect(getByRole("img").getAttribute("src")).toBe("/new.jpg");
  });
  it("preserves internal loading and fallback behavior with consumer handlers", () => {
    const onLoad = vi.fn();
    const onError = vi.fn();
    const { getByRole, container } = render(createElement(ImageWithFallback, { src: "/broken.jpg", alt: "Product", onLoad, onError }));
    fireEvent.error(getByRole("img"));
    expect(onError).toHaveBeenCalledOnce();
    expect(getByRole("img").getAttribute("src")).toBe("/images/product-placeholder.svg");
    fireEvent.load(getByRole("img"));
    expect(onLoad).toHaveBeenCalledOnce();
    expect(container.querySelector(".skeleton")).toBeNull();
  });
  it("stops the loading indicator even when the placeholder fails", () => {
    const { getByRole, container } = render(createElement(ImageWithFallback, { alt: "Product" }));
    fireEvent.error(getByRole("img"));
    expect(container.querySelector(".skeleton")).toBeNull();
    expect(container.textContent).toContain("Image unavailable");
  });
});
