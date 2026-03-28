require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB, pool } = require('../config/db');
const { ensureCoreSchema } = require('../config/schema');
const Settings = require('../models/Settings');
const { uploadBuffer, toPublicUrl, parseStoragePath } = require('../utils/supabaseStorage');

const uploadsDir = path.join(__dirname, '..', 'uploads');

async function migrateUploads() {
  await connectDB();
  await ensureCoreSchema(pool);

  if (!fs.existsSync(uploadsDir)) {
    console.log('No local uploads directory found. Nothing to migrate.');
    return;
  }

  const files = fs.readdirSync(uploadsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  if (!files.length) {
    console.log('Local uploads directory is empty. Nothing to migrate.');
    return;
  }

  console.log(`Found ${files.length} local file(s) to migrate...`);

  for (const fileName of files) {
    const filePath = path.join(uploadsDir, fileName);
    const buffer = fs.readFileSync(filePath);
    const mimeType = fileName.endsWith('.pdf')
      ? 'application/pdf'
      : /\.(png|jpg|jpeg|webp)$/i.test(fileName)
        ? `image/${fileName.toLowerCase().endsWith('.png') ? 'png' : 'jpeg'}`
        : 'application/octet-stream';

    await uploadBuffer({
      path: fileName,
      buffer,
      contentType: mimeType,
      upsert: true,
    });

    console.log(`Uploaded: ${fileName}`);
  }

  const settings = await Settings.getOne();
  const previousPath = parseStoragePath(settings?.logoDataUrl);
  if (previousPath && fs.existsSync(path.join(uploadsDir, previousPath))) {
    await Settings.update({
      companyName: settings.companyName,
      logoDataUrl: toPublicUrl(previousPath),
    });
    console.log('Migrated settings logo.');
  }

  console.log('Local uploads migration completed successfully.');
}

migrateUploads()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Upload migration failed:', error);
    process.exit(1);
  });
