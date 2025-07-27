#!/usr/bin/env tsx

/**
 * Script to create sample .apkg files for integration testing
 * Run with: npx tsx create-sample-decks.ts
 */

import path from 'path';
import { createTestApkg, createSampleImage } from '../helpers/file-fixtures.js';
import { sampleCards } from '../helpers/test-data.js';

async function createSampleDecks() {
  const outputDir = path.join(__dirname, 'sample-decks');
  
  console.log('Creating sample .apkg files for integration testing...');
  
  try {
    // Create basic vocabulary deck
    const vocabApkg = await createTestApkg({
      deckName: 'Vocabulary Test Deck',
      cards: sampleCards.vocabulary
    });
    console.log(`✅ Created vocabulary deck: ${vocabApkg}`);
    
    // Create medical terminology deck
    const medicalApkg = await createTestApkg({
      deckName: 'Medical Terms',
      cards: sampleCards.medical
    });
    console.log(`✅ Created medical deck: ${medicalApkg}`);
    
    // Create single card deck for simple tests
    const singleApkg = await createTestApkg({
      deckName: 'Single Card Test',
      cards: sampleCards.single
    });
    console.log(`✅ Created single card deck: ${singleApkg}`);
    
    // Create deck with HTML content
    const htmlApkg = await createTestApkg({
      deckName: 'HTML Content Test',
      cards: sampleCards.htmlContent
    });
    console.log(`✅ Created HTML content deck: ${htmlApkg}`);
    
    // Create edge cases deck
    const edgeApkg = await createTestApkg({
      deckName: 'Edge Cases',
      cards: sampleCards.edgeCases
    });
    console.log(`✅ Created edge cases deck: ${edgeApkg}`);
    
    // Create deck with existing media
    const mediaApkg = await createTestApkg({
      deckName: 'Deck With Media',
      cards: sampleCards.vocabulary,
      mediaFiles: new Map([
        ['existing-image.png', createSampleImage()],
        ['another-file.jpg', createSampleImage()]
      ])
    });
    console.log(`✅ Created deck with media: ${mediaApkg}`);
    
    console.log(`\n🎉 All sample decks created successfully!`);
    console.log(`📁 Files are stored as temporary files that will be created during tests`);
    
  } catch (error) {
    console.error('❌ Error creating sample decks:', error);
    process.exit(1);
  }
}

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createSampleDecks();
}

export { createSampleDecks };