/**
 * Words for money on a GST invoice: "Rupees One Thousand Two Hundred and
 * Fifty-Six and Forty Paise Only", in the Indian system (thousand, lakh,
 * crore). Pure and dependency-free so the invoice, the customer download and
 * the tests share it.
 */
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below1000(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) parts.push(n % 10 ? `${TENS[Math.floor(n / 10)]}-${ONES[n % 10]}` : TENS[Math.floor(n / 10)]);
  else if (n > 0) parts.push(ONES[n]);
  return parts.join(" and ");
}

function wholeInWords(n: number): string {
  if (n === 0) return "Zero";
  const units: Array<[number, string]> = [[10_000_000, "Crore"], [100_000, "Lakh"], [1000, "Thousand"]];
  const parts: string[] = [];
  let rest = n;
  for (const [size, name] of units) {
    if (rest >= size) {
      parts.push(`${wholeInWords(Math.floor(rest / size))} ${name}`);
      rest %= size;
    }
  }
  if (rest > 0) parts.push(below1000(rest));
  return parts.join(" ");
}

export function rupeesInWords(amountCents: number): string {
  if (!Number.isInteger(amountCents) || amountCents < 0) throw new RangeError("An amount in words needs a whole, non-negative number of paise");
  const rupees = Math.floor(amountCents / 100);
  const paise = amountCents % 100;
  const base = `Rupees ${wholeInWords(rupees)}`;
  return paise > 0 ? `${base} and ${wholeInWords(paise)} Paise Only` : `${base} Only`;
}

/** A rate in basis points as the invoice prints it: 300 → "3%", 150 → "1.5%". */
export function rateLabel(bps: number): string {
  const percent = bps / 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2).replace(/0+$/, "")}%`;
}
