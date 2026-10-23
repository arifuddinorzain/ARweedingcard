import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadImage } from 'canvas';
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log("Loading image...");
  const imgPath = path.resolve(__dirname, '../public/pengantin.jpg');
  const img = await loadImage(imgPath);
  console.log(`Image loaded: ${img.width}x${img.height}`);

  const compiler = new OfflineCompiler();
  console.log("Compiling image target for MindAR...");
  
  await compiler.compileImageTargets([img], (progress) => {
    process.stdout.write(`\rProgress: ${progress.toFixed(1)}%`);
  });
  console.log("\nCompilation complete! Exporting data...");

  const exportedBuffer = compiler.exportData();
  const outputPath = path.resolve(__dirname, '../public/card.mind');
  fs.writeFileSync(outputPath, Buffer.from(exportedBuffer));
  console.log(`Saved targets.mind to ${outputPath} (${exportedBuffer.length} bytes)`);
}

run().catch(err => {
  console.error("Error during compilation:", err);
  process.exit(1);
});
