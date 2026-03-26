import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputImagePath = path.join(__dirname, "../public/darts_clean.jpg");
const publicDir = path.join(__dirname, "../public");

async function generateIcons() {
  if (!fs.existsSync(inputImagePath)) {
    console.error(`Error: Cannot find input image at ${inputImagePath}`);
    return;
  }

  const sizes = [
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "apple-touch-icon.png", size: 180 },
    { name: "favicon.png", size: 32 },
  ];

  console.log("Generating PWA Icons...");

  for (const item of sizes) {
    const outputPath = path.join(publicDir, item.name);
    try {
      await sharp(inputImagePath)
        .resize(item.size, item.size, {
          fit: "cover",
          position: "center",
        })
        .png()
        .toFile(outputPath);
      console.log(`Created: ${item.name} (${item.size}x${item.size})`);
    } catch (err) {
      console.error(`Failed to create ${item.name}:`, err);
    }
  }

  console.log("Finished generating icons.");
}

generateIcons();
