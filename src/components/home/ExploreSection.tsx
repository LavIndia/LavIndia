import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isFeatured: boolean;
  featuredOrder: number;
};

export function ExploreSection({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gradient-to-b from-white to-amber-50/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Explore Collections
          </h2>
          <Link
            href={`/${categories[0]?.slug || "earrings"}`}
            className="text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 group"
          >
            View All
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="relative">
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/${category.slug}`}
                className="group flex-shrink-0 snap-start"
              >
                <div className="relative w-64 h-80 rounded-2xl overflow-hidden border-2 border-gray-200 hover:border-amber-500 transition-all duration-300 hover:shadow-2xl hover:scale-105">
                  <Image
                    src={
                      category.image ||
                      `/assets/pictures/collections/${category.slug}/thumbnail.jpg`
                    }
                    alt={category.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-white/90 text-sm group-hover:text-white transition-colors">
                      {category.description || "Explore Collection"} →
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
