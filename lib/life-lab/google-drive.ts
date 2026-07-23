import { createSign } from "node:crypto";

import {
  LIFE_LAB_DRIVE_READONLY_SCOPE,
  LIFE_LAB_MAX_FILES_PER_SECTION,
  LIFE_LAB_MAX_FOLDER_DEPTH,
} from "@/lib/life-lab/constants";
import { recordLifeLabDriveCall } from "@/lib/life-lab/cache-telemetry";

type DriveCredentials = {
  clientEmail: string;
  privateKey: string;
  rootFolderId: string;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  modifiedTime?: string;
  size?: string;
};

type DriveListResponse = {
  files?: DriveFile[];
  nextPageToken?: string;
};

export type DriveListingStats = {
  fileCount: number;
  foldersTraversed: number;
  maxDepthUsed: number;
  paginationOccurred: boolean;
};

export class LifeLabDriveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LifeLabDriveError";
  }
}

export function getLifeLabDriveCredentials(): DriveCredentials | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const rootFolderId = process.env.LIFE_LAB_DRIVE_FOLDER_ID?.trim();

  if (!clientEmail || !privateKeyRaw || !rootFolderId) {
    return null;
  }

  return {
    clientEmail,
    privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
    rootFolderId,
  };
}

function base64UrlEncode(input: Buffer | string): string {
  const buffer = typeof input === "string" ? Buffer.from(input) : input;

  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createServiceAccountJwt(credentials: DriveCredentials): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  );
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: credentials.clientEmail,
      scope: LIFE_LAB_DRIVE_READONLY_SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64UrlEncode(signer.sign(credentials.privateKey));

  return `${unsigned}.${signature}`;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(
  credentials: DriveCredentials,
): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const assertion = createServiceAccountJwt(credentials);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new LifeLabDriveError("Failed to authenticate with Google Drive.");
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    throw new LifeLabDriveError("Google Drive authentication returned no token.");
  }

  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };

  return data.access_token;
}

async function driveRequest<T>(
  credentials: DriveCredentials,
  path: string,
): Promise<T> {
  recordLifeLabDriveCall("list");
  const accessToken = await getAccessToken(credentials);
  const response = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new LifeLabDriveError(
      `Google Drive request failed (${response.status}).`,
    );
  }

  return (await response.json()) as T;
}

async function driveDownload(
  credentials: DriveCredentials,
  fileId: string,
): Promise<string> {
  recordLifeLabDriveCall("download", fileId);
  const accessToken = await getAccessToken(credentials);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new LifeLabDriveError("Failed to download note from Google Drive.");
  }

  return response.text();
}

async function driveDownloadBytes(
  credentials: DriveCredentials,
  fileId: string,
): Promise<Uint8Array> {
  recordLifeLabDriveCall("download", fileId);
  const accessToken = await getAccessToken(credentials);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new LifeLabDriveError("Failed to download asset from Google Drive.");
  }

  return new Uint8Array(await response.arrayBuffer());
}

export function isMarkdownDriveFile(file: DriveFile): boolean {
  const name = file.name.toLowerCase();

  if (!name.endsWith(".md")) {
    return false;
  }

  if (!file.mimeType) {
    return true;
  }

  return (
    file.mimeType === "text/markdown" ||
    file.mimeType === "text/plain" ||
    file.mimeType === "application/octet-stream"
  );
}

export function isFlashcardDeckDriveFile(file: DriveFile): boolean {
  const name = file.name.toLowerCase();

  if (
    !name.endsWith(".md") &&
    !name.endsWith(".txt") &&
    !name.endsWith(".deck")
  ) {
    return false;
  }

  if (!file.mimeType) {
    return true;
  }

  return (
    file.mimeType === "text/markdown" ||
    file.mimeType === "text/plain" ||
    file.mimeType === "application/octet-stream"
  );
}

export function isDriveFolder(file: DriveFile): boolean {
  return file.mimeType === "application/vnd.google-apps.folder";
}

export async function listDriveChildren(
  credentials: DriveCredentials,
  folderId: string,
): Promise<{ files: DriveFile[]; paginationOccurred: boolean }> {
  const query = `'${folderId}' in parents and trashed = false`;
  const fields = "nextPageToken,files(id,name,mimeType,modifiedTime,size)";
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  let paginationOccurred = false;

  do {
    const params = new URLSearchParams({
      q: query,
      fields,
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
      paginationOccurred = true;
    }

    const data = await driveRequest<DriveListResponse>(
      credentials,
      `/files?${params.toString()}`,
    );

    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return { files, paginationOccurred };
}

export async function findDriveFileByRelativePath(
  credentials: DriveCredentials,
  rootFolderId: string,
  relativePath: string,
): Promise<DriveFile | null> {
  const parts = relativePath
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..");

  if (parts.length === 0) {
    return null;
  }

  let folderId = rootFolderId;

  for (const [index, part] of parts.entries()) {
    const { files } = await listDriveChildren(credentials, folderId);
    const match = files.find(
      (file) => file.name.toLowerCase() === part.toLowerCase(),
    );

    if (!match) {
      return null;
    }

    if (index === parts.length - 1) {
      return isDriveFolder(match) ? null : match;
    }

    if (!isDriveFolder(match)) {
      return null;
    }

    folderId = match.id;
  }

  return null;
}

export type DriveMarkdownEntry = {
  file: DriveFile;
  relativePath: string;
};

export type DriveMarkdownListing = {
  entries: DriveMarkdownEntry[];
  stats: DriveListingStats;
};

export async function listMarkdownFilesRecursive(
  credentials: DriveCredentials,
  folderId: string,
  options?: {
    maxDepth?: number;
    maxFiles?: number;
    shouldSkipFolder?: (folderName: string, prefix: string) => boolean;
    isFileIncluded?: (file: DriveFile) => boolean;
  },
): Promise<DriveMarkdownListing> {
  const maxDepth = options?.maxDepth ?? LIFE_LAB_MAX_FOLDER_DEPTH;
  const maxFiles = options?.maxFiles ?? LIFE_LAB_MAX_FILES_PER_SECTION;
  const isFileIncluded = options?.isFileIncluded ?? isMarkdownDriveFile;
  const results: DriveMarkdownEntry[] = [];
  const stats: DriveListingStats = {
    fileCount: 0,
    foldersTraversed: 0,
    maxDepthUsed: 0,
    paginationOccurred: false,
  };

  async function walk(
    currentFolderId: string,
    prefix: string,
    folderDepth: number,
  ): Promise<void> {
    if (folderDepth > maxDepth || results.length >= maxFiles) {
      return;
    }

    stats.maxDepthUsed = Math.max(stats.maxDepthUsed, folderDepth);

    const { files: children, paginationOccurred } = await listDriveChildren(
      credentials,
      currentFolderId,
    );

    if (paginationOccurred) {
      stats.paginationOccurred = true;
    }

    for (const item of children) {
      if (results.length >= maxFiles) {
        break;
      }

      if (isDriveFolder(item)) {
        const nextPrefix = prefix ? `${prefix}/${item.name}` : item.name;

        if (options?.shouldSkipFolder?.(item.name, prefix)) {
          continue;
        }

        stats.foldersTraversed += 1;
        await walk(item.id, nextPrefix, folderDepth + 1);
        continue;
      }

      if (!isFileIncluded(item)) {
        continue;
      }

      const relativePath = prefix ? `${prefix}/${item.name}` : item.name;
      results.push({ file: item, relativePath });
      stats.fileCount += 1;
    }
  }

  await walk(folderId, "", 0);

  return { entries: results, stats };
}

export async function downloadDriveFile(
  credentials: DriveCredentials,
  fileId: string,
): Promise<string> {
  return driveDownload(credentials, fileId);
}

export async function downloadDriveFileBytes(
  credentials: DriveCredentials,
  fileId: string,
): Promise<Uint8Array> {
  return driveDownloadBytes(credentials, fileId);
}

export type { DriveCredentials, DriveFile };
