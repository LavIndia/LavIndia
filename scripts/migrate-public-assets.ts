import { loadEnvConfig } from "@next/env";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { uploadPublicAsset } from "../src/lib/imagekit-admin";

loadEnvConfig(process.cwd());

const publicDirectory = path.join(process.cwd(), "public");

if (!process.env.IMAGEKIT_URL_ENDPOINT || !process.env.IMAGEKIT_PRIVATE_KEY) {
  throw new Error("Set IMAGEKIT_URL_ENDPOINT and IMAGEKIT_PRIVATE_KEY before migrating assets.");
}

const contentTypes: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
    } else {
      files.push(absolutePath);
    }
  }

  return files;
}

async function main() {
  const files = await collectFiles(publicDirectory);

  for (const absolutePath of files) {
    const publicPath = `/${path
      .relative(publicDirectory, absolutePath)
      .replace(/\\/g, "/")}`;
    const extension = path.extname(absolutePath).toLowerCase();
    const contentType = contentTypes[extension] || "application/octet-stream";
    const file = await readFile(absolutePath);
    await uploadPublicAsset(publicPath, file, contentType);
    console.log(`Uploaded ${publicPath}`);
  }

  console.log(`Uploaded ${files.length} public assets to ImageKit.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
