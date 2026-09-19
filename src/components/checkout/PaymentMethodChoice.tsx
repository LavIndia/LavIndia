"use client";

import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { css } from "styled-system/css";
import { ChoiceCard, choiceListStyle } from "./ChoiceCard";

/**
 * What the customer picks at checkout.
 *
 * Named for the instrument the customer recognises — UPI, card, cash —
 * because that is the decision they are actually making. Which processor
 * carries a UPI or card payment is our plumbing, not theirs, so it is not
 * mentioned on this screen.
 */
export type CheckoutPaymentChoice = "upi" | "card" | "cod";

/** Whether a choice is settled now, online, or on the doorstep. */
export function isOnlinePayment(choice: CheckoutPaymentChoice): boolean {
  return choice !== "cod";
}

const iconStyle = css({ width: "5", height: "5" });

const OPTIONS: {
  value: CheckoutPaymentChoice;
  title: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "upi",
    title: "UPI",
    description: "Pay from any UPI app — GPay, PhonePe, Paytm or your bank.",
    icon: <Smartphone className={iconStyle} />,
  },
  {
    value: "card",
    title: "Card",
    description: "Credit or debit card, authorised by your bank.",
    icon: <CreditCard className={iconStyle} />,
  },
  {
    value: "cod",
    title: "Cash on delivery",
    description: "Pay in cash when the piece reaches you.",
    icon: <Banknote className={iconStyle} />,
  },
];

export function PaymentMethodChoice({
  value,
  onChange,
}: {
  value: CheckoutPaymentChoice;
  onChange: (value: CheckoutPaymentChoice) => void;
}) {
  return (
    <div className={choiceListStyle}>
      {OPTIONS.map((option) => (
        <ChoiceCard
          key={option.value}
          name="payment"
          value={option.value}
          checked={value === option.value}
          onSelect={() => onChange(option.value)}
          icon={option.icon}
          title={option.title}
          description={option.description}
        />
      ))}
    </div>
  );
}
