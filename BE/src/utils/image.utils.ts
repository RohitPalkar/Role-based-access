import * as sharp from 'sharp';

export async function extractInkOnly(inputBuffer: Buffer): Promise<Buffer> {
  const image = sharp(inputBuffer);
  const { width, height } = await image.metadata();
  if (!width || !height) throw new Error('Invalid image dimensions');

  const alphaMask = await image
    .grayscale()
    .threshold(100)
    .negate()
    .raw()
    .toBuffer();

  const bbox = findBoundingBox(alphaMask, width, height, 20);
  if (!bbox) return Buffer.from([]); // optional: handle empty image

  const rgb = await image.removeAlpha().raw().toBuffer();

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4 + 0] = rgb[i * 3 + 0];
    rgba[i * 4 + 1] = rgb[i * 3 + 1];
    rgba[i * 4 + 2] = rgb[i * 3 + 2];
    rgba[i * 4 + 3] = alphaMask[i];
  }

  return sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract(bbox)
    .png()
    .toBuffer();
}

function findBoundingBox(
  alphaMask: Buffer,
  width: number,
  height: number,
  margin = 0,
) {
  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (alphaMask[i] !== 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If no ink found, return null
  if (minX > maxX || minY > maxY) return null;

  // Apply margin and clamp to image size
  const left = Math.max(minX - margin, 0);
  const top = Math.max(minY - margin, 0);
  return {
    left,
    top,
    width: Math.min(maxX - minX + 1 + 2 * margin, width - left),
    height: Math.min(maxY - minY + 1 + 2 * margin, height - top),
  };
}

export async function compressImage(
  inputBuffer: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  const compressedBuffer = await sharp(inputBuffer)
    .resize(width, height, {
      fit: 'inside',
    })
    .jpeg({
      quality: 100,
      progressive: true,
      chromaSubsampling: '4:4:4',
    })
    .toBuffer();

  return compressedBuffer;
}
