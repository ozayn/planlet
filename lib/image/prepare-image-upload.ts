import {
  IMAGE_QUALITY_DEFAULT,
  IMAGE_QUALITY_MIN,
  IMAGE_TARGET_MAX_BYTES,
  MAX_IMAGE_DIMENSION,
} from "@/lib/image/constants";

export type PrepareImageResult = {
  file: File;
  wasResized: boolean;
};

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the image file."));
    };

    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not compress the image."));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

function scaledDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number; wasResized: boolean } {
  const longest = Math.max(width, height);

  if (longest <= maxDimension) {
    return { width, height, wasResized: false };
  }

  const scale = maxDimension / longest;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    wasResized: true,
  };
}

async function compressCanvas(
  canvas: HTMLCanvasElement,
): Promise<{ blob: Blob; mimeType: string }> {
  let quality = IMAGE_QUALITY_DEFAULT;
  let mimeType = "image/webp";
  let blob = await canvasToBlob(canvas, mimeType, quality);

  if (blob.type !== "image/webp") {
    mimeType = "image/jpeg";
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  while (blob.size > IMAGE_TARGET_MAX_BYTES && quality > IMAGE_QUALITY_MIN) {
    quality -= 0.05;
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  return { blob, mimeType };
}

function preparedFileName(originalName: string, mimeType: string): string {
  const base = originalName.replace(/\.[^.]+$/, "").trim() || "notebook";
  const extension = mimeType === "image/webp" ? "webp" : "jpg";
  return `${base}-prepared.${extension}`;
}

export async function prepareImageForUpload(file: File): Promise<PrepareImageResult> {
  const image = await loadImageElement(file);
  const { width, height, wasResized } = scaledDimensions(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    MAX_IMAGE_DIMENSION,
  );

  const shouldReencode =
    wasResized ||
    file.size > IMAGE_TARGET_MAX_BYTES ||
    !["image/jpeg", "image/webp"].includes(file.type);

  if (!shouldReencode) {
    return { file, wasResized: false };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare the image.");
  }

  context.drawImage(image, 0, 0, width, height);

  const { blob, mimeType } = await compressCanvas(canvas);
  const prepared = new File([blob], preparedFileName(file.name, mimeType), {
    type: mimeType,
    lastModified: Date.now(),
  });

  return {
    file: prepared,
    wasResized: wasResized || prepared.size < file.size * 0.9,
  };
}
