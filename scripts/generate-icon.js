import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const svgPath = path.join(rootDir, 'public', 'logo-icon.svg');
const icoPath = path.join(distDir, 'favicon.ico');
const pngPath = path.join(distDir, 'logo.png');

// 生成图标文件
async function generateIcon() {
  try {
    // 生成 512x512 PNG 文件（供 electron-builder 使用）
    await sharp(svgPath).resize(512, 512).png().toFile(pngPath);
    console.log(`✅ 成功生成 ${pngPath}`);
    console.log(`   PNG 文件大小: ${fs.statSync(pngPath).size} bytes`);

    // 生成多尺寸 ICO 文件（供运行时窗口图标使用）
    const sizes = [16, 32, 48, 256];
    const buffers = await Promise.all(
      sizes.map(size => sharp(svgPath).resize(size, size).png().toBuffer())
    );

    // ICO Header
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);  // Reserved
    header.writeUInt16LE(1, 2);  // Type: 1 = ICO
    header.writeUInt16LE(sizes.length, 4);  // Number of images

    // Directory entries
    const dirSize = sizes.length * 16;
    const directory = Buffer.alloc(dirSize);
    let dataOffset = 6 + dirSize;

    sizes.forEach((size, i) => {
      const offset = i * 16;
      directory.writeUInt8(size < 256 ? size : 0, offset);
      directory.writeUInt8(size < 256 ? size : 0, offset + 1);
      directory.writeUInt8(0, offset + 2);  // Color count
      directory.writeUInt8(0, offset + 3);  // Reserved
      directory.writeUInt16LE(1, offset + 4);  // Color planes
      directory.writeUInt16LE(32, offset + 6);  // Bits per pixel
      directory.writeUInt32LE(buffers[i].length, offset + 8);  // Image data size
      directory.writeUInt32LE(dataOffset, offset + 12);  // Data offset
      dataOffset += buffers[i].length;
    });

    // Combine all
    const ico = Buffer.concat([header, directory, ...buffers]);
    fs.writeFileSync(icoPath, ico);
    
    console.log(`✅ 成功生成 ${icoPath}`);
    console.log(`   ICO 文件大小: ${ico.length} bytes`);
    console.log(`   包含尺寸: ${sizes.join(', ')}px`);
  } catch (error) {
    console.error('❌ 生成图标失败:', error.message);
    process.exit(1);
  }
}

generateIcon();
