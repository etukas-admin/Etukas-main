export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type PolicySection = {
  id: string;
  title: string;
  summary: string;
};

export const ETUKAS_FAQS: FaqItem[] = [
  {
    id: "faq-delivery",
    question: "How does Etukas deliver heavy construction materials to my site?",
    answer:
      "Once you place an order, the nearest verified Etukas partner store confirms stock, loads the vehicle, and assigns a driver. You can track every stage live and call the driver directly from My Orders."
  },
  {
    id: "faq-cancel",
    question: "When can I cancel my order?",
    answer:
      "You can cancel your order anytime before the store begins loading the delivery vehicle. Once the status changes to Loading Vehicle or Assigned Driver, cancellation is locked to protect transit commitments."
  },
  {
    id: "faq-radius",
    question: "Why do prices and products change when I update my location?",
    answer:
      "Building material pricing and availability depend on your construction site's delivery distance from local depots. Setting your exact site location ensures accurate local rates and fast dispatch."
  },
  {
    id: "faq-reviews",
    question: "How do Ratings & Reviews work on Etukas?",
    answer:
      "After an order is marked Delivered, you can rate the material quality, packaging, and delivery timeliness from My Account, My Orders, or My Reviews. All reviews are verified against actual orders."
  },
  {
    id: "faq-coupons",
    question: "How do I use an Etukas coupon code?",
    answer:
      "Open My Coupons from your Account page, copy or claim any eligible coupon code, and apply it during checkout on qualifying building material orders."
  }
];

export const ETUKAS_POLICIES: PolicySection[] = [
  {
    id: "policy-terms",
    title: "Terms & Conditions",
    summary:
      "Etukas connects customers with verified local material suppliers and skilled technicians. Prices, taxes, and delivery charges are shown transparently before order confirmation."
  },
  {
    id: "policy-privacy",
    title: "Privacy Policy",
    summary:
      "Your personal contact number, delivery site coordinates, and order history are strictly used for order fulfillment, live delivery tracking, and customer support. We never sell your data."
  },
  {
    id: "policy-shipping",
    title: "Shipping & Delivery Policy",
    summary:
      "Materials are dispatched by partner stores within their configured delivery radius. Please ensure vehicle access at your construction site and inspect material counts upon unloading."
  },
  {
    id: "policy-refund",
    title: "Cancellation & Refund Policy",
    summary:
      "Orders cancelled prior to vehicle loading are eligible for full refund on prepaid methods. For damaged or short-delivered items, raise a ticket via Help within 24 hours of delivery."
  }
];
