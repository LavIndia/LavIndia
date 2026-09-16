import { Package, Heart, PhoneCall } from "lucide-react";
import { css } from "styled-system/css";

type TrustBadgesSettings = {
  codAvailable: boolean;
  customerCount: string;
  rating: string;
  supportHoursStart: string | null;
  supportHoursEnd: string | null;
};

const sectionStyle = css({
  paddingY: "10",
  background: "linear-gradient(to right, {colors.gold.50}, {colors.ivory.50}, {colors.gold.50})",
  borderTop: "1px solid",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
});

const containerStyle = css({ marginX: "auto", paddingX: "4" });

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  md: { gridTemplateColumns: "repeat(3, 1fr)" },
  gap: "6",
  maxWidth: "5xl",
  marginX: "auto",
});

const cardStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "4",
  padding: "5",
  background: "bg.surface",
  borderRadius: "lg",
  boxShadow: "card",
  border: "1px solid",
  borderColor: "border.subtle",
  transition: "box-shadow 0.2s ease",
  "&:hover": { boxShadow: "glass" },
});

const titleStyle = css({ fontWeight: "bold", color: "fg.default", fontSize: "md" });
const descStyle = css({ fontSize: "sm", color: "fg.muted" });

export function TrustBadgesBanner({
  settings,
}: {
  settings: TrustBadgesSettings | null;
}) {
  if (!settings) {
    return null;
  }

  // customerCount is stored pre-formatted (e.g. "9L+"); pass through as-is,
  // only applying K/L shorthand if it's a plain number.
  const formatCustomerCount = (count: string) => {
    const numeric = Number(count);
    if (!Number.isFinite(numeric)) return count;
    if (numeric >= 100000) return `${(numeric / 100000).toFixed(0)}L+`;
    if (numeric >= 1000) return `${(numeric / 1000).toFixed(0)}K+`;
    return count;
  };

  // Format support hours (e.g., "10:30" -> "10:30 AM")
  const formatTime = (time: string | null) => {
    if (!time) return "N/A";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <section className={sectionStyle}>
      <div className={containerStyle}>
        <div className={gridStyle}>
          {/* COD Available */}
          {settings.codAvailable && (
            <div className={cardStyle}>
              <div className={css({ padding: "4", borderRadius: "full", flexShrink: "0", background: "success" })}>
                <Package className={css({ height: "8", width: "8", color: "white" })} />
              </div>
              <div>
                <h3 className={titleStyle}>COD Available</h3>
                <p className={descStyle}>Cash on Delivery option</p>
              </div>
            </div>
          )}

          {/* Loved by Customers */}
          {settings.customerCount && (
            <div className={cardStyle}>
              <div className={css({ padding: "4", borderRadius: "full", flexShrink: "0", background: "rose.300" })}>
                <Heart className={css({ height: "8", width: "8", color: "white" })} fill="white" />
              </div>
              <div>
                <h3 className={titleStyle}>
                  Loved by {formatCustomerCount(settings.customerCount)} Customers
                </h3>
                {settings.rating && (
                  <p className={descStyle}>{settings.rating} ⭐ Google Rating</p>
                )}
              </div>
            </div>
          )}

          {/* Customer Support */}
          {(settings.supportHoursStart || settings.supportHoursEnd) && (
            <div className={cardStyle}>
              <div className={css({ padding: "4", borderRadius: "full", flexShrink: "0", background: "gold.400" })}>
                <PhoneCall className={css({ height: "8", width: "8", color: "fg.onGold" })} />
              </div>
              <div>
                <h3 className={titleStyle}>Customer Support</h3>
                <p className={descStyle}>
                  {formatTime(settings.supportHoursStart)} –{" "}
                  {formatTime(settings.supportHoursEnd)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
