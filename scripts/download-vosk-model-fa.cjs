/**
 * اسکریپت دانلود مدل سبک فارسی Vosk
 * این اسکریپت مدل کوچک فارسی Vosk را دانلود و استخراج می‌کند
 * 
 * استفاده:
 *   npm run download-vosk-fa
 * 
 * یا:
 *   node scripts/download-vosk-model-fa.cjs
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// مدل فارسی - URL های مختلف را امتحان می‌کنیم
const MODEL_OPTIONS = [
  {
    name: 'vosk-model-small-fa-0.22',
    urls: [
      'https://alphacephei.com/vosk/models/vosk-model-small-fa-0.22.zip',
      'https://github.com/alphacep/vosk-api/releases/download/v0.22/vosk-model-small-fa-0.22.zip',
      'https://alphacephei.com/vosk/models/vosk-model-small-fa-0.22-lgraph.zip'
    ],
    size: '~45 MB',
    description: 'مدل کوچک (سبک)'
  },
  {
    name: 'vosk-model-fa-0.22',
    urls: [
      'https://alphacephei.com/vosk/models/vosk-model-fa-0.22.zip',
      'https://github.com/alphacep/vosk-api/releases/download/v0.22/vosk-model-fa-0.22.zip'
    ],
    size: '~1.4 GB',
    description: 'مدل بزرگ (دقیق‌تر)'
  }
];

// متغیرهای موقت
let MODEL_NAME = '';
let MODEL_URL = '';
const MODELS_DIR = path.join(__dirname, '..', 'models');

// ایجاد پوشه models در صورت عدم وجود
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  console.log(`✓ پوشه ${MODELS_DIR} ایجاد شد`);
}

console.log('📥 شروع دانلود مدل فارسی Vosk...');

// تابع دانلود فایل با پشتیبانی از HTTP و HTTPS
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, (response) => {
      // ریدایرکت
      if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 307 || response.statusCode === 308) {
        file.close();
        fs.unlinkSync(dest);
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          console.log(`   در حال ریدایرکت به: ${redirectUrl}`);
          return downloadFile(redirectUrl, dest).then(resolve).catch(reject);
        }
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`خطا در دانلود: ${response.statusCode} ${response.statusMessage}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize) {
          const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
          process.stdout.write(`\r   پیشرفت: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
        } else {
          process.stdout.write(`\r   دانلود شده: ${(downloadedSize / 1024 / 1024).toFixed(2)} MB`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\n✓ دانلود کامل شد');
        resolve();
      });

      file.on('error', (err) => {
        file.close();
        if (fs.existsSync(dest)) {
          fs.unlinkSync(dest);
        }
        reject(err);
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(err);
    });

    request.setTimeout(300000, () => {
      request.destroy();
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(new Error('زمان دانلود به پایان رسید'));
    });
  });
}

// تابع استخراج فایل ZIP
function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    try {
      // استفاده از unzip در Windows یا unzip در Linux/Mac
      const isWindows = process.platform === 'win32';
      
      if (isWindows) {
        // در Windows از PowerShell استفاده می‌کنیم
        console.log('\n📦 در حال استخراج فایل ZIP...');
        const powershellCmd = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`;
        execSync(powershellCmd, { stdio: 'inherit' });
      } else {
        // در Linux/Mac از unzip استفاده می‌کنیم
        console.log('\n📦 در حال استخراج فایل ZIP...');
        execSync(`unzip -q "${zipPath}" -d "${destDir}"`, { stdio: 'inherit' });
      }
      
      // حذف فایل ZIP پس از استخراج
      fs.unlinkSync(zipPath);
      console.log('✓ استخراج کامل شد و فایل ZIP حذف شد');
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// اجرای دانلود و استخراج
async function main() {
  // امتحان کردن هر مدل تا یکی کار کند
  for (let i = 0; i < MODEL_OPTIONS.length; i++) {
    const modelOption = MODEL_OPTIONS[i];
    MODEL_NAME = modelOption.name;
    const currentZipPath = path.join(MODELS_DIR, `${MODEL_NAME}.zip`);
    const currentModelDir = path.join(MODELS_DIR, MODEL_NAME);
    
    // اگر این مدل قبلاً دانلود شده، از آن استفاده می‌کنیم
    if (fs.existsSync(currentModelDir)) {
      console.log(`✓ مدل ${MODEL_NAME} قبلاً دانلود شده است در: ${currentModelDir}`);
      process.exit(0);
    }
    
    console.log(`\n🔄 در حال امتحان مدل: ${MODEL_NAME} (${modelOption.description})...`);
    console.log(`   حجم تقریبی: ${modelOption.size}`);
    
    // امتحان کردن هر URL برای این مدل
    let downloadSuccess = false;
    for (let j = 0; j < modelOption.urls.length; j++) {
      MODEL_URL = modelOption.urls[j];
      try {
        console.log(`   در حال امتحان URL ${j + 1}/${modelOption.urls.length}: ${MODEL_URL}`);
        
        // دانلود مدل
        await downloadFile(MODEL_URL, currentZipPath);
        downloadSuccess = true;
        break;
      } catch (error) {
        console.log(`   ⚠️  این URL کار نکرد: ${error.message}`);
        if (fs.existsSync(currentZipPath)) {
          fs.unlinkSync(currentZipPath);
        }
        // ادامه به URL بعدی
      }
    }
    
    if (!downloadSuccess) {
      console.error(`\n⚠️  هیچ یک از URL های ${MODEL_NAME} کار نکرد.`);
      if (i === MODEL_OPTIONS.length - 1) {
        console.error('\n❌ هیچ یک از مدل‌های فارسی در دسترس نیست.');
        console.error('\n📋 راهنمای دانلود دستی:');
        console.error('   1. به https://alphacephei.com/vosk/models بروید');
        console.error('   2. مدل فارسی مورد نظر را پیدا کنید');
        console.error('   3. فایل ZIP را دانلود کنید');
        console.error(`   4. فایل را در پوشه ${MODELS_DIR} استخراج کنید`);
        console.error(`   5. نام پوشه استخراج شده باید vosk-model-fa-0.22 یا vosk-model-small-fa-0.22 باشد`);
        process.exit(1);
      }
      continue;
    }
    
    try {
      
      // استخراج مدل
      await extractZip(currentZipPath, MODELS_DIR);
      
      // بررسی اینکه مدل به درستی استخراج شده است
      if (fs.existsSync(currentModelDir)) {
        console.log(`\n✅ مدل ${MODEL_NAME} با موفقیت دانلود و نصب شد!`);
        console.log(`   مسیر: ${currentModelDir}`);
        process.exit(0);
      } else {
        // ممکن است مدل در یک پوشه داخلی استخراج شده باشد
        const extractedDirs = fs.readdirSync(MODELS_DIR).filter(f => 
          fs.statSync(path.join(MODELS_DIR, f)).isDirectory() && f.includes('vosk-model')
        );
        
        if (extractedDirs.length > 0) {
          const actualModelDir = path.join(MODELS_DIR, extractedDirs[0]);
          if (extractedDirs[0] !== MODEL_NAME) {
            // تغییر نام پوشه به نام مورد نظر
            fs.renameSync(actualModelDir, currentModelDir);
            console.log(`\n✅ مدل با موفقیت نصب شد و نام پوشه به ${MODEL_NAME} تغییر یافت!`);
          } else {
            console.log(`\n✅ مدل ${MODEL_NAME} با موفقیت نصب شد!`);
          }
          console.log(`   مسیر: ${currentModelDir}`);
          process.exit(0);
        } else {
          throw new Error('مدل به درستی استخراج نشد');
        }
      }
    } catch (error) {
      console.error(`\n⚠️  خطا در دانلود ${MODEL_NAME}: ${error.message}`);
      
      // در صورت خطا، فایل ناقص را حذف می‌کنیم
      if (fs.existsSync(currentZipPath)) {
        fs.unlinkSync(currentZipPath);
      }
      
      // اگر آخرین مدل بود و خطا داد، خطا را نمایش می‌دهیم
      if (i === MODEL_OPTIONS.length - 1) {
        console.error('\n❌ هیچ یک از مدل‌های فارسی در دسترس نیست.');
        console.error('   لطفاً به صورت دستی مدل را از https://alphacephei.com/vosk/models دانلود کنید.');
        process.exit(1);
      }
      
      // ادامه به مدل بعدی
      console.log(`   در حال امتحان مدل بعدی...\n`);
      continue;
    }
  }
}

main();
