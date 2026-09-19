"use client";

import { Truck, Zap } from "lucide-react";
import { css } from "styled-system/css";
import { ChoiceCard, choiceListStyle } from "./ChoiceCard";

export type CheckoutShippingChoice = "standard" | "express";

const iconStyle = css({ width: "5", height: "5" });

const OPTIONS: {
  value: CheckoutShippingChoice;
  title: string;
  description: string;
  feeRupees: number;
  icon: React.ReactNode;
}[] = [
  {
    value: "standard",
    title: "Standard delivery",
    description: "Arrives in 3–7 working days, insured and signed for.",
    feeRupees: 99,
    icon: <Truck className={iconStyle} />,
  },
  {
    value: "express",
    title: "Express delivery",
    description: "Arrives in 1–2 working days, insured and signed for.",
    feeRupees: 199,
    icon: <Zap className={iconStyle} />,
  },
];

/** Delivery speed, presented the same way as the payment choice. */
export function ShippingMethodChoice({
  value,
  onChange,
}: {
  value: CheckoutShippingChoice;
  onChange: (value: CheckoutShippingChoice) => void;
}) {
  return (
    <div className={choiceListStyle}>
      {OPTIONS.map((option) => (
        <ChoiceCard
          key={option.value}
          name="shipping"
          value={option.value}
          checked={value === option.value}
          onSelect={() => onChange(option.value)}
          icon={option.icon}
          title={option.title}
          description={option.description}
          meta={`₹${option.feeRupees}`}
        />
      ))}
    </div>
  );
}
