/**
 * Script to generate app icons from SVG
 * Requires: sharp (npm install sharp --save-dev)
 * 
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    const sharp = require('sharp');
    const svgPath = path.join(__dirname, '../assets/icon.svg');
    const assetsDir = path.join(__dirname, '../assets');
    
    if (!fs.existsSync(svgPath)) {
      console.error('SVG icon not found at:', svgPath);
      process.exit(1);
    }
    
    const svgBuffer = fs.readFileSync(svgPath);
    
    console.log('Generating icons from SVG...');
    
    // Generate PNG (512x512 for Linux and general use)
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(assetsDir, 'icon.png'));
    console.log('✓ Generated icon.png (512x512)');
    
    // Generate ICO for Windows (multi-size)
    const icoSizes = [16, 32, 48, 64, 128, 256];
    const icoImages = await Promise.all(
      icoSizes.map(size => 
        sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );
    
    // Note: sharp doesn't support ICO directly, so we'll create a high-res PNG
    // For actual ICO, use online converter or imagemagick
    await sharp(svgBuffer)
      .resize(256, 256)
      .png()
      .toFile(path.join(assetsDir, 'icon-256.png'));
    console.log('✓ Generated icon-256.png (for ICO conversion)');
    console.log('  Note: Convert icon-256.png to .ico using online tool or ImageMagick');
    
    // Generate ICNS for macOS (multi-size)
    const icnsSizes = [16, 32, 64, 128, 256, 512, 1024];
    for (const size of icnsSizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(assetsDir, `icon-${size}.png`));
    }
    console.log('✓ Generated PNG files for ICNS conversion');
    console.log('  Note: Use iconutil or online tool to create .icns from PNG files');
    
    console.log('\n✅ Icon generation complete!');
    console.log('\nNext steps:');
    console.log('1. Convert icon-256.png to icon.ico (Windows)');
    console.log('2. Convert PNG files to icon.icns (macOS)');
    console.log('3. Or use: npm install -g electron-icon-maker');
    console.log('   Then run: electron-icon-maker --input=./assets/icon.png --output=./assets');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('Error: sharp module not found.');
      console.error('Please install it: npm install sharp --save-dev');
    } else {
      console.error('Error generating icons:', error.message);
    }
    process.exit(1);
  }
}

generateIcons();
