import Link from "next/link";
import { DollarSign, TrendingDown } from "lucide-react";

type BudgetTier = {
  id: string;
  title: string;
  maxPrice: number;
  gradient: string | null;
  icon: string | null;
  order: number;
  isActive: boolean;
};

export function ShopUnderBudgetSection({ tiers }: { tiers: BudgetTier[] }) {
  if (tiers.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full">
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Shop Under Budget
            </h2>
          </div>
          <p className="text-gray-600">Beautiful jewelry for every budget</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <Link
              key={tier.id}
              href={`/shop/budget?max=${tier.maxPrice}`}
              className="group"
            >
              <div className="relative bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                  style={{
                    background:
                      tier.gradient ||
                      "linear-gradient(to bottom right, #10b981, #059669)",
                  }}
                />

                <div className="relative z-10 text-center">
                  <div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300"
                    style={{
                      background:
                        tier.gradient ||
                        "linear-gradient(to bottom right, #10b981, #059669)",
                    }}
                  >
                    <DollarSign className="h-8 w-8 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {tier.title}
                  </h3>

                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                    <span>Shop Now</span>
                    <span className="group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
