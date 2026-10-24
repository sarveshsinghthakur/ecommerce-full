import type { Metadata } from "next";
import { StaticPage } from "@/components/store/static-page";

export const metadata: Metadata = {
  title: "Returns & refunds",
  description: "Return window, condition requirements, and how refunds are issued.",
};

export default function ReturnsPage() {
  return (
    <StaticPage
      title="Returns & refunds"
      intro="If something is not right, here is exactly how to send it back and get your money back."
      updated="18 October 2026"
      sections={[
        {
          heading: "Return window",
          paragraphs: [
            "You can request a return within 7 days of delivery, from the Orders page in your account or by contacting us with your order reference.",
          ],
        },
        {
          heading: "Condition of returned items",
          bullets: [
            "Unused, unwashed and in original condition.",
            "All tags, accessories and original packaging included.",
            "Free gifts and bundled items returned with the main product.",
            "Items marked non-returnable at the time of purchase are excluded and are clearly labelled on the product page.",
          ],
        },
        {
          heading: "Damaged or incorrect items",
          paragraphs: [
            "If your order arrives damaged, defective, or different from what you ordered, report it within 48 hours with photographs. In that case we cover the return shipping cost and offer a replacement or a full refund — your choice.",
          ],
        },
        {
          heading: "Refund timeline",
          bullets: [
            "Refunds are issued to the original payment method once the returned item passes inspection.",
            "Typical bank processing time is 5–7 business days after approval.",
            "For cash-on-delivery orders, refunds are sent to a bank account you nominate, verified against the order's contact details.",
            "Original shipping charges are refunded only where the item was damaged, defective or incorrectly supplied.",
          ],
        },
        {
          heading: "Exchanges",
          paragraphs: [
            "Size and variant exchanges are processed as a return plus a new order, so the replacement is reserved immediately rather than waiting for the refund to clear.",
          ],
        },
      ]}
    />
  );
}
