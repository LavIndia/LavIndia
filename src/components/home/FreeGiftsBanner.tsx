type PromoBanner = {
  id: string;
  type: string;
  title: string | null;
  message: string;
  bgColor: string | null;
  textColor: string | null;
  isActive: boolean;
};

export function FreeGiftsBanner({ banner }: { banner: PromoBanner | null }) {
  if (!banner) {
    return null;
  }

  const textColor = banner.textColor || "#1f2937";

  return (
    <section
      className="py-16 relative overflow-hidden"
      style={{
        background:
          banner.bgColor ||
          "linear-gradient(to right, #fce7f3, #f3e8ff, #dbeafe)",
      }}
    >
      {!banner.bgColor && (
        <>
          {/* Decorative elements - only show if using default gradient */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-pink-200 rounded-full opacity-30 -translate-x-32 -translate-y-32" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200 rounded-full opacity-30 translate-x-48 translate-y-48" />
        </>
      )}

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {banner.title && (
            <div className="inline-block mb-4">
              <span
                className="bg-white/80 backdrop-blur-sm font-bold px-6 py-2 rounded-full text-sm shadow-lg"
                style={{ color: textColor }}
              >
                {banner.title}
              </span>
            </div>
          )}
          <h2
            className="text-5xl md:text-6xl font-bold mb-4"
            style={{ color: textColor }}
          >
            {banner.message}
          </h2>
        </div>
      </div>
    </section>
  );
}
