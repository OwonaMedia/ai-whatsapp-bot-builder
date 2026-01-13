"use client";

import Image from "next/image";

export type PaymentLogosSize = "sm" | "md" | "lg";
export type PaymentLogosVariant = "inline" | "grid";

interface PaymentLogosProps {
  size?: PaymentLogosSize;
  variant?: PaymentLogosVariant;
  className?: string;
  subdued?: boolean;
}

const DEFAULT_LOGOS = [
  { src: "/payment-logos/visa.svg", alt: "Visa" },
  { src: "/payment-logos/mastercard.svg", alt: "Mastercard" },
  { src: "/payment-logos/paypal.svg", alt: "PayPal" },
  { src: "/payment-logos/stripe.svg", alt: "Stripe" },
  { src: "/payment-logos/apple-pay.svg", alt: "Apple Pay" },
  { src: "/payment-logos/google-pay.svg", alt: "Google Pay" },
  { src: "/payment-logos/klarna.svg", alt: "Klarna" },
  { src: "/payment-logos/mollie.svg", alt: "Mollie" },
];

function sizeToDims(size: PaymentLogosSize) {
  switch (size) {
    case "sm":
      return { width: 56, height: 22, padX: "px-2", padY: "py-1" };
    case "lg":
      return { width: 96, height: 32, padX: "px-4", padY: "py-2" };
    case "md":
    default:
      return { width: 72, height: 28, padX: "px-3", padY: "py-1.5" };
  }
}

export function PaymentLogos({ size = "md", variant = "inline", className, subdued = false }: PaymentLogosProps) {
  const dims = sizeToDims(size);
  const wrapperBase = subdued
    ? "ring-1 ring-gray-200 bg-white"
    : "ring-1 ring-white/20 bg-white/10";

  if (variant === "grid") {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${className ?? ""}`.trim()}>
        {DEFAULT_LOGOS.map((logo) => (
          <span
            key={logo.alt}
            className={`inline-flex items-center justify-center rounded-lg ${wrapperBase} ${dims.padX} ${dims.padY}`}
            aria-label={logo.alt}
          >
            <Image src={logo.src} alt={logo.alt} width={dims.width} height={dims.height} />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`.trim()}>
      {DEFAULT_LOGOS.map((logo) => (
        <span
          key={logo.alt}
          className={`inline-flex items-center justify-center rounded-full ${wrapperBase} ${dims.padX} ${dims.padY}`}
          aria-label={logo.alt}
        >
          <Image src={logo.src} alt={logo.alt} width={dims.width} height={dims.height} />
        </span>
      ))}
    </div>
  );
}

export default PaymentLogos;
