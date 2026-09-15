"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isFeatured: boolean;
  featuredOrder: number;
};

export function Navigation() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/categories/featured");
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Failed to fetch featured categories:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <NavigationMenu>
        <NavigationMenuList className="flex gap-6">
          {[1, 2, 3].map((i) => (
            <NavigationMenuItem key={i}>
              <div className="flex flex-col items-center gap-2 p-2">
                <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
                <div className="w-16 h-4 bg-gray-200 animate-pulse rounded" />
              </div>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    );
  }

  return (
    <NavigationMenu>
      <NavigationMenuList className="flex gap-6">
        {categories.map((category) => (
          <NavigationMenuItem key={category.id}>
            <NavigationMenuLink asChild>
              <Link
                href={`/${category.slug}`}
                className="flex flex-col items-center gap-2 p-2 rounded-lg transition-all duration-300 group"
              >
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 group-hover:border-amber-600 group-hover:scale-105 transition-all duration-300">
                  <Image
                    src={
                      category.image ||
                      `/assets/pictures/collections/${category.slug}/thumbnail.jpg`
                    }
                    alt={`${category.name} collection`}
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-amber-600 transition-colors duration-300">
                  {category.name}
                </span>
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
