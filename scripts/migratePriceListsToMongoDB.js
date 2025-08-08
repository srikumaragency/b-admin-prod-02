const mongoose = require('mongoose');
const fetch = require('node-fetch');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Old schema (Cloudinary-based)
const oldPriceListSchema = new mongoose.Schema({
  documentName: String,
  pdfUrl: String,
  publicId: String,
  fileSize: Number,
  isActive: Boolean,
  uploadedBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

// New schema (MongoDB-based)
const newPriceListSchema = new mongoose.Schema({
  documentName: String,
  pdfData: Buffer,
  mimeType: String,
  originalFileName: String,
  fileSize: Number,
  isActive: Boolean,
  uploadedBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const OldPriceList = mongoose.model('OldPriceList', oldPriceListSchema, 'pricelists');
const NewPriceList = mongoose.model('NewPriceList', newPriceListSchema, 'pricelists');

async function migratePriceLists() {
  try {
    console.log('Starting price list migration...');

    // Find all existing price lists with Cloudinary URLs
    const oldPriceLists = await OldPriceList.find({ pdfUrl: { $exists: true } });
    
    console.log(`Found ${oldPriceLists.length} price lists to migrate`);

    for (const oldPriceList of oldPriceLists) {
      try {
        console.log(`Migrating: ${oldPriceList.documentName}`);

        // Download PDF from Cloudinary
        const response = await fetch(oldPriceList.pdfUrl);
        if (!response.ok) {
          console.error(`Failed to download PDF for ${oldPriceList.documentName}: ${response.statusText}`);
          continue;
        }

        const pdfBuffer = await response.buffer();

        // Update the document with new schema
        await NewPriceList.findByIdAndUpdate(oldPriceList._id, {
          $set: {
            pdfData: pdfBuffer,
            mimeType: 'application/pdf',
            originalFileName: `${oldPriceList.documentName}.pdf`,
          },
          $unset: {
            pdfUrl: 1,
            publicId: 1,
          }
        });

        console.log(`✓ Successfully migrated: ${oldPriceList.documentName}`);

      } catch (error) {
        console.error(`Error migrating ${oldPriceList.documentName}:`, error.message);
      }
    }

    console.log('Migration completed!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run migration
migratePriceLists();