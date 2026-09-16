import { css } from "styled-system/css";

type PromoBanner = {
  id: string;
  type: string;
  title: string | null;
  message: string;
  bgColor: string | null;
  textColor: string | null;
  isActive: boolean;
};

const sectionStyle = css({ paddingY: "12", md: { paddingY: "16" }, position: "relative", overflow: "hidden" });

const decorTopStyle = css({
  position: "absolute",
  top: "0",
  left: "0",
  width: "64",
  height: "64",
  borderRadius: "full",
  background: "gold.100",
  opacity: "0.4",
  transform: "translate(-50%, -50%)",
});

const decorBottomStyle = css({
  position: "absolute",
  bottom: "0",
  right: "0",
  width: "96",
  height: "96",
  borderRadius: "full",
  background: "rose.300",
  opacity: "0.25",
  transform: "translate(50%, 50%)",
});

const containerStyle = css({ marginX: "auto", paddingX: "4", position: "relative", zIndex: "10" });
const innerStyle = css({ maxWidth: "4xl", marginX: "auto", textAlign: "center" });

const badgeStyle = css({
  display: "inline-block",
  marginBottom: "4",
});

const badgeTextStyle = css({
  background: "bg.glassStrong",
  backdropBlur: "glass",
  fontWeight: "bold",
  paddingX: "5",
  paddingY: "2",
  borderRadius: "full",
  fontSize: "sm",
  boxShadow: "glass",
  border: "1px solid",
  borderColor: "border.glass",
  color: "fg.default",
});

const messageStyle = css({
  fontFamily: "display",
  fontSize: "3xl",
  sm: { fontSize: "4xl" },
  md: { fontSize: "5xl" },
  fontWeight: "semibold",
  marginBottom: "4",
  color: "fg.default",
});

const DEFAULT_BG = "linear-gradient(to right, {colors.rose.300}, {colors.gold.50}, {colors.ivory.100})";

export function FreeGiftsBanner({ banner }: { banner: PromoBanner | null }) {
  if (!banner) {
    return null;
  }

  const textColor = banner.textColor || undefined;

  return (
    <section
      className={sectionStyle}
      style={{ background: banner.bgColor || undefined }}
    >
      {!banner.bgColor && (
        <div className={css({ position: "absolute", inset: "0", background: DEFAULT_BG })} />
      )}
      {!banner.bgColor && (
        <>
          <div className={decorTopStyle} />
          <div className={decorBottomStyle} />
        </>
      )}

      <div className={containerStyle}>
        <div className={innerStyle}>
          {banner.title && (
            <div className={badgeStyle}>
              <span className={badgeTextStyle} style={{ color: textColor }}>
                {banner.title}
              </span>
            </div>
          )}
          <h2 className={messageStyle} style={{ color: textColor }}>
            {banner.message}
          </h2>
        </div>
      </div>
    </section>
  );
}
