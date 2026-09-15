import { Package, Heart, PhoneCall } from "lucide-react";

type TrustBadgesSettings = {
  codAvailable: boolean;
  customerCount: string;
  rating: string;
  supportHoursStart: string | null;
  supportHoursEnd: string | null;
};

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
    <section className="py-12 bg-gradient-to-r from-amber-50 via-white to-amber-50 border-y border-amber-200">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* COD Available */}
          {settings.codAvailable && (
            <div className="flex items-center gap-4 p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-amber-100">
              <div className="p-4 bg-green-100 rounded-full shrink-0">
                <Package className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  COD Available
                </h3>
                <p className="text-sm text-gray-600">Cash on Delivery option</p>
              </div>
            </div>
          )}

          {/* Loved by Customers */}
          {settings.customerCount && (
            <div className="flex items-center gap-4 p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-amber-100">
              <div className="p-4 bg-pink-100 rounded-full shrink-0">
                <Heart className="h-8 w-8 text-pink-600 fill-pink-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  Loved by {formatCustomerCount(settings.customerCount)}{" "}
                  Customers
                </h3>
                {settings.rating && (
                  <p className="text-sm text-gray-600">
                    {settings.rating} ⭐ Google Rating
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Customer Support */}
          {(settings.supportHoursStart || settings.supportHoursEnd) && (
            <div className="flex items-center gap-4 p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-amber-100">
              <div className="p-4 bg-blue-100 rounded-full shrink-0">
                <PhoneCall className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  Customer Support
                </h3>
                <p className="text-sm text-gray-600">
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
