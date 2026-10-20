import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Block all AI and scraper bots
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "OAI-SearchBot",
          "ClaudeBot",
          "anthropic-ai",
          "Claude-Web",
          "Google-Extended",
          "CCBot",
          "PerplexityBot",
          "Bytespider",
          "Amazonbot",
          "Applebot-Extended",
          "meta-externalagent",
          "cohere-ai",
          "Diffbot",
          "MJ12bot",
          "SeekportBot",
          "SurveyBot",
          "Googlebot-Image",
        ],
        disallow: "/",
      },
      {
        // Disallow protected paths for all bots
        userAgent: "*",
        disallow: ["/admin/", "/api/", "/checkout/", "/profile/", "/orders/", "/addresses/", "/wishlist/"],
      },
      {
        // Allow Google and Bing to index public catalog
        userAgent: ["Googlebot", "Bingbot"],
        allow: "/",
        disallow: ["/admin/", "/api/", "/checkout/", "/profile/", "/orders/", "/addresses/", "/wishlist/"],
      },
    ],
  };
}
