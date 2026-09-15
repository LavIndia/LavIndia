import path from "path";

type ImageKitFile = {
  fileId: string;
  filePath: string;
  name: string;
};

const uploadEndpoint = "https://upload.imagekit.io/api/v1/files/upload";

function getImageKitConfig() {
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT?.replace(/\/+$/, "");
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

  if (!urlEndpoint || !privateKey) {
    throw new Error(
      "ImageKit requires IMAGEKIT_URL_ENDPOINT and IMAGEKIT_PRIVATE_KEY",
    );
  }

  return { urlEndpoint, privateKey };
}

function authorizationHeader(privateKey: string) {
  return `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`;
}

export function imageKitPathFromPublicPath(publicPath: string) {
  return `/${publicPath.replace(/^\/+/, "")}`;
}

export function imageKitUrlFromPublicPath(publicPath: string) {
  return `${getImageKitConfig().urlEndpoint}${imageKitPathFromPublicPath(publicPath)}`;
}

export async function uploadPublicAsset(
  publicPath: string,
  file: Buffer,
  contentType: string,
) {
  const { privateKey } = getImageKitConfig();
  const storagePath = imageKitPathFromPublicPath(publicPath);
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([file as unknown as BlobPart], { type: contentType }),
  );
  formData.append("fileName", path.basename(storagePath));
  formData.append("folder", path.posix.dirname(storagePath));
  formData.append("useUniqueFileName", "false");
  formData.append("overwriteFile", "true");

  const response = await fetch(uploadEndpoint, {
    method: "POST",
    headers: { Authorization: authorizationHeader(privateKey) },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(
      `ImageKit upload failed: ${response.status} ${await response.text()}`,
    );
  }

  return publicPath;
}

async function findFile(publicPath: string) {
  const { privateKey } = getImageKitConfig();
  const storagePath = imageKitPathFromPublicPath(publicPath);
  const response = await fetch(
    `https://api.imagekit.io/v1/files?path=${encodeURIComponent(path.posix.dirname(storagePath))}&limit=1000`,
    { headers: { Authorization: authorizationHeader(privateKey) } },
  );

  if (!response.ok) {
    throw new Error(`ImageKit file lookup failed: ${response.status}`);
  }

  const files = (await response.json()) as ImageKitFile[];
  return files.find((file) => file.filePath === storagePath);
}

export async function removePublicAsset(publicPath: string) {
  const { privateKey } = getImageKitConfig();
  const file = await findFile(publicPath);
  if (!file) return;

  const response = await fetch(
    `https://api.imagekit.io/v1/files/${file.fileId}`,
    {
      method: "DELETE",
      headers: { Authorization: authorizationHeader(privateKey) },
    },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`ImageKit delete failed: ${response.status}`);
  }
}

export async function listPublicAssets(prefix: string) {
  const { privateKey } = getImageKitConfig();
  const storagePath = imageKitPathFromPublicPath(prefix);
  const response = await fetch(
    `https://api.imagekit.io/v1/files?path=${encodeURIComponent(storagePath)}&limit=1000`,
    { headers: { Authorization: authorizationHeader(privateKey) } },
  );

  if (!response.ok) {
    throw new Error(`ImageKit file listing failed: ${response.status}`);
  }

  const files = (await response.json()) as ImageKitFile[];
  return files
    .filter((file) => file.filePath.startsWith(`${storagePath}/`))
    .map((file) => file.name);
}
