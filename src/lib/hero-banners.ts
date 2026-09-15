import { readdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { listPublicAssets } from "@/lib/imagekit-admin";

const heroBannerDirectory = path.join(
  process.cwd(),
  "public",
  "assets",
  "pictures",
  "herobanner",
);
const heroBannerPublicPath = "/assets/pictures/herobanner";
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const syncCacheDurationMs = 15_000;
let lastSyncAt = 0;
let activeSync: Promise<void> | null = null;

function titleFromFilename(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

async function syncHeroBanners() {
  let filenames: string[];

  if (process.env.IMAGEKIT_ENABLED === "true") {
    filenames = (await listPublicAssets(heroBannerPublicPath)).filter((file) =>
      imageExtensions.has(path.extname(file).toLowerCase()),
    );
  } else {
    filenames = (await readdir(heroBannerDirectory, { withFileTypes: true }))
      .filter(
        (entry) =>
          entry.isFile() &&
          imageExtensions.has(path.extname(entry.name).toLowerCase()),
      )
      .map((entry) => entry.name)
      .sort((first, second) => first.localeCompare(second));
  }
  const storedPaths = filenames.map(
    (filename) => `${heroBannerPublicPath}/${filename}`,
  );

  const existingBanners = await prisma.heroBanner.findMany({
    where: { imagePath: { startsWith: `${heroBannerPublicPath}/` } },
    orderBy: { order: "desc" },
  });
  const existingPaths = new Set(
    existingBanners.map((banner) => banner.imagePath),
  );

  await prisma.heroBanner.deleteMany({
    where: {
      imagePath: {
        startsWith: `${heroBannerPublicPath}/`,
        notIn: storedPaths,
      },
    },
  });

  const highestOrder = existingBanners[0]?.order ?? 0;
  const newFiles = storedPaths.filter(
    (imagePath) => !existingPaths.has(imagePath),
  );

  await Promise.all(
    newFiles.map((imagePath, index) =>
      prisma.heroBanner.create({
        data: {
          title: titleFromFilename(path.basename(imagePath)),
          imagePath,
          linkUrl: "/shop",
          order: highestOrder + index + 1,
          active: true,
        },
      }),
    ),
  );
}

export async function syncHeroBannersFromStorage() {
  const now = Date.now();
  if (now - lastSyncAt < syncCacheDurationMs) return;
  if (activeSync) return activeSync;

  activeSync = syncHeroBanners()
    .then(() => {
      lastSyncAt = Date.now();
    })
    .finally(() => {
      activeSync = null;
    });

  return activeSync;
}
