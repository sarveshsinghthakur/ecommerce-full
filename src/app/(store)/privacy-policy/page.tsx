import type { Metadata } from "next";
import { StaticPage } from "@/components/store/static-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Aurora collects, why we collect it, and the control you have over it.",
};

export default function PrivacyPage() {
  return (
    <StaticPage
      title="Privacy policy"
      intro="This policy explains what information Aurora Store collects, how it is used, and the choices you have."
      updated="18 October 2026"
      sections={[
        {
          heading: "Information we collect",
          bullets: [
            "Account details you provide: name, email address and, optionally, phone number.",
            "Delivery details: shipping address and pincode, saved only when you choose to save them.",
            "Order history: products purchased, prices charged, and fulfilment status.",
            "Technical logs: IP address, browser type and request timestamps, retained for security and abuse prevention.",
          ],
        },
        {
          heading: "Information we do not collect",
          bullets: [
            "Full card numbers, CVV or banking passwords — payments are handled entirely by our payment provider.",
            "Precise location, contacts, or device identifiers.",
            "Anything from your account on a marketplace we import from; we read only the public listing.",
          ],
        },
        {
          heading: "How we use it",
          bullets: [
            "To process, fulfil and support your orders.",
            "To keep your cart and wishlist in sync across sessions when you are signed in.",
            "To send transactional messages — order confirmations, shipping updates, refund notices.",
            "To detect and prevent fraud, abuse and unauthorised access to the admin area.",
          ],
        },
        {
          heading: "Sharing",
          paragraphs: [
            "We share data only with the parties required to run the store: the payment provider processing your transaction, couriers delivering your parcel, and the infrastructure hosts storing the application. We do not sell personal information, and we do not share it for third-party advertising.",
          ],
        },
        {
          heading: "Cookies",
          paragraphs: [
            "We use strictly necessary cookies: a session cookie to keep you signed in, and an anonymous cart cookie so a guest basket survives a page refresh. Neither is used for advertising or cross-site tracking.",
          ],
        },
        {
          heading: "Retention and your rights",
          bullets: [
            "Order records are retained as long as required by tax and consumer-protection law.",
            "You can request access to, correction of, or deletion of your personal data at any time via the contact page.",
            "Account deletion removes profile data and wipes saved addresses; anonymised order records needed for accounting are retained.",
          ],
        },
        {
          heading: "Contact",
          paragraphs: [
            "Questions about this policy can be sent through our contact page. We respond within one business day.",
          ],
        },
      ]}
    />
  );
}
