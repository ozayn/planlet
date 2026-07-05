import { createSign } from "node:crypto";

import { LIFE_LAB_DRIVE_READONLY_SCOPE } from "@/lib/life-lab/constants";

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
};

type DriveListResponse = {
  files?: DriveFile[];
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
  const accessToken = await getAccessToken(credentials);
  const response = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new LifeLabDriveError("Google Drive request failed.");
  }

  return (await response.json()) as T;
}

async function driveDownload(
  credentials: DriveCredentials,
  fileId: string,
): Promise<string> {
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

export async function listDriveChildren(
  credentials: DriveCredentials,
  folderId: string,
): Promise<DriveFile[]> {
  const query = `'${folderId}' in parents and trashed = false`;
  const fields = "files(id,name,mimeType,modifiedTime)";
  const data = await driveRequest<DriveListResponse>(
    credentials,
    `/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`,
  );

  return data.files ?? [];
}

export async function downloadDriveFile(
  credentials: DriveCredentials,
  fileId: string,
): Promise<string> {
  return driveDownload(credentials, fileId);
}

export type { DriveCredentials, DriveFile };
