/**
 * Script to create all icon formats (PNG, ICO, ICNS)
 */

const fs = require('fs');
const path = require('path');
const toIco = require('to-ico');
const sharp = require('sharp');

async function createAllIcons() {
  try {
    const svgPath = path.join(__dirname, '../assets/icon.svg');
    const assetsDir = path.join(__dirname, '../assets');
    
    if (!fs.existsSync(svgPath)) {
      console.error('SVG icon not found at:', svgPath);
      process.exit(1);
    }
    
    const svgBuffer = fs.readFileSync(svgPath);
    
    console.log('Creating all icon formats...\n');
    
    // 1. Create PNG (512x512) - already done, but ensure it exists
    if (!fs.existsSync(path.join(assetsDir, 'icon.png'))) {
      await sharp(svgBuffer)
        .resize(512, 512)
        .png()
        .toFile(path.join(assetsDir, 'icon.png'));
      console.log('✓ Created icon.png (512x512)');
    } else {
      console.log('✓ icon.png already exists');
    }
    
    // 2. Create ICO for Windows (multi-size)
    console.log('\nCreating Windows ICO file...');
    const icoSizes = [16, 32, 48, 64, 128, 256];
    const icoBuffers = await Promise.all(
      icoSizes.map(size => 
        sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );
    
    const icoBuffer = await toIco(icoBuffers);
    fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);
    console.log('✓ Created icon.ico (Windows)');
    
    // 3. For macOS ICNS, we need to create an iconset
    console.log('\nCreating macOS ICNS preparation files...');
    const icnsSizes = [16, 32, 64, 128, 256, 512, 1024];
    const iconsetDir = path.join(assetsDir, 'icon.iconset');
    
    if (!fs.existsSync(iconsetDir)) {
      fs.mkdirSync(iconsetDir, { recursive: true });
    }
    
    for (const size of icnsSizes) {
      const filename = size === 1024 ? 'icon_512x512@2x.png' :
                      size === 512 ? 'icon_512x512.png' :
                      size === 256 ? 'icon_256x256@2x.png' :
                      size === 128 ? 'icon_128x128@2x.png' :
                      size === 64 ? 'icon_32x32@2x.png' :
                      size === 32 ? 'icon_32x32.png' :
                      'icon_16x16.png';
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(iconsetDir, filename));
    }
    
    console.log('✓ Created icon.iconset directory');
    console.log('\nTo create icon.icns, run on macOS:');
    console.log('  iconutil -c icns assets/icon.iconset -o assets/icon.icns');
    console.log('\nOr use online converter: https://cloudconvert.com/png-to-icns');
    
    console.log('\n✅ Icon generation complete!');
    console.log('\nGenerated files:');
    console.log('  - assets/icon.png (512x512) - Linux/General');
    console.log('  - assets/icon.ico - Windows');
    console.log('  - assets/icon.iconset/ - macOS (convert to .icns)');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('\nMissing dependencies. Please install:');
      console.error('  npm install to-ico sharp --save-dev');
    }
    process.exit(1);
  }
}

createAllIcons();
