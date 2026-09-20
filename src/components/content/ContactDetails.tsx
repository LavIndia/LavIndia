import { Mail, MapPin, Phone, ReceiptText } from "lucide-react";
import { css } from "styled-system/css";

/**
 * The business's own contact details, as held in site settings.
 *
 * Deliberately driven by the database rather than by a copy file: the address
 * and the phone number are the sort of thing that changes without anyone
 * thinking to tell a developer, and an admin can already edit them in
 * Settings. A detail that has not been filled in is omitted entirely — label
 * and all — because an empty "Phone" row tells a customer nothing and looks
 * like a fault.
 */

const cardStyle = css({
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.glass",
  background: "bg.glass",
  backdropBlur: "glass",
  boxShadow: "glass",
  padding: { base: "5", md: "6" },
  marginBottom: "10",
});

const rowStyle = css({
  display: "flex",
  alignItems: "flex-start",
  gap: "4",
  "& + &": {
    marginTop: "4",
    paddingTop: "4",
    borderTop: "1px solid",
    borderColor: "border.subtle",
  },
});

const iconWrapStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "10",
  height: "10",
  borderRadius: "full",
  background: "accent.default",
  color: "fg.onGold",
});

const iconStyle = css({ width: "5", height: "5" });

const labelStyle = css({
  fontSize: "xs",
  fontWeight: "semibold",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "fg.muted",
  marginBottom: "1",
});

const valueStyle = css({
  color: "fg.default",
  fontSize: "md",
  lineHeight: "1.6",
  whiteSpace: "pre-line",
});

const linkStyle = css({
  color: "fg.default",
  fontSize: "md",
  textUnderlineOffset: "4px",
  _hover: { color: "accent.pressed", textDecoration: "underline" },
});

export interface ContactDetailsProps {
  address?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  gstNumber?: string | null;
}

export function ContactDetails({
  address,
  contactNumber,
  email,
  gstNumber,
}: ContactDetailsProps) {
  const rows = [
    address
      ? { key: "address", label: "Address", icon: MapPin, node: <p className={valueStyle}>{address}</p> }
      : null,
    contactNumber
      ? {
          key: "phone",
          label: "Phone",
          icon: Phone,
          node: (
            <a className={linkStyle} href={`tel:${contactNumber.replace(/\s+/g, "")}`}>
              {contactNumber}
            </a>
          ),
        }
      : null,
    email
      ? {
          key: "email",
          label: "Email",
          icon: Mail,
          node: (
            <a className={linkStyle} href={`mailto:${email}`}>
              {email}
            </a>
          ),
        }
      : null,
    gstNumber
      ? { key: "gst", label: "GST Number", icon: ReceiptText, node: <p className={valueStyle}>{gstNumber}</p> }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  // Nothing configured yet: render nothing rather than an empty card.
  if (rows.length === 0) return null;

  return (
    <div className={cardStyle}>
      {rows.map(({ key, label, icon: Icon, node }) => (
        <div key={key} className={rowStyle}>
          <span className={iconWrapStyle}>
            <Icon className={iconStyle} />
          </span>
          <div>
            <p className={labelStyle}>{label}</p>
            {node}
          </div>
        </div>
      ))}
    </div>
  );
}
