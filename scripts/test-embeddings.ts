/**
 * Test script to verify embeddings pipeline
 * Run with: npx tsx scripts/test-embeddings.ts
 *
 * Make sure to set the following environment variables:
 * - OPENAI_API_KEY
 * - PINECONE_API_KEY
 * - PINECONE_INDEX
 */

// Load environment variables first
import './load-env';

import { generateEmbeddings, generateEmbeddingsBatch } from '../lib/ai/embeddings';
import { chunkDocument } from '../lib/ai/chunking';
import { upsertVectors, queryVectors, isPineconeConfigured } from '../lib/vector/pinecone';

async function testEmbeddings() {
  console.log('🧪 Testing Embeddings Pipeline...\n');

  // Test 1: Single embedding generation
  console.log('Test 1: Generating single embedding...');
  try {
    const testText = 'This is a test document for embedding generation.';
    const embedding = await generateEmbeddings(testText);
    console.log(`✅ Single embedding generated: ${embedding.length} dimensions`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).join(', ')}...]\n`);
  } catch (error) {
    console.error('❌ Single embedding failed:', error instanceof Error ? error.message : error);
    return;
  }

  // Test 2: Batch embedding generation
  console.log('Test 2: Generating batch embeddings...');
  try {
    const testTexts = [
      'First document about artificial intelligence.',
      'Second document about machine learning.',
      'Third document about natural language processing.',
    ];
    const embeddings = await generateEmbeddingsBatch(testTexts);
    console.log(`✅ Batch embeddings generated: ${embeddings.length} embeddings`);
    console.log(`   Each embedding has ${embeddings[0]?.length || 0} dimensions\n`);
  } catch (error) {
    console.error('❌ Batch embedding failed:', error instanceof Error ? error.message : error);
    return;
  }

  // Test 3: Document chunking
  console.log('Test 3: Testing document chunking...');
  try {
    const longText = `
      This is a long document that needs to be chunked into smaller pieces.
      Each chunk should be approximately 500 tokens with a 50 token overlap.
      This ensures that context is preserved across chunk boundaries.
      The chunking algorithm should split on sentence boundaries when possible.
      This makes the chunks more semantically meaningful.
      Multiple sentences can be combined into a single chunk if they fit within the token limit.
      The overlap helps maintain context between adjacent chunks.
    `.repeat(10);

    const chunks = chunkDocument(longText, 500, 50);
    console.log(`✅ Document chunked into ${chunks.length} chunks`);
    console.log(`   First chunk: "${chunks[0]?.text.substring(0, 100)}..."`);
    console.log(`   Last chunk: "${chunks[chunks.length - 1]?.text.substring(0, 100)}..."\n`);
  } catch (error) {
    console.error('❌ Chunking failed:', error instanceof Error ? error.message : error);
    return;
  }

  // Test 4: Pinecone operations (if configured)
  if (!isPineconeConfigured()) {
    console.log('⚠️  Pinecone not configured. Skipping vector database tests.');
    console.log('   Set PINECONE_API_KEY and PINECONE_INDEX to test vector operations.\n');
    return;
  }

  console.log('Test 4: Testing Pinecone vector operations...');
  try {
    const testDocumentId = `test-doc-${Date.now()}`;
    const testUserId = 'test-user';

    // Generate test embeddings
    const testTexts = [
      'Artificial intelligence is transforming the world.',
      'Machine learning enables computers to learn from data.',
      'Natural language processing helps computers understand human language.',
    ];
    const embeddings = await generateEmbeddingsBatch(testTexts);

    // Prepare vectors for Pinecone
    const vectors = embeddings.map((embedding, index) => ({
      id: `${testDocumentId}-chunk-${index}`,
      values: embedding,
      metadata: {
        documentId: testDocumentId,
        userId: testUserId,
        chunkIndex: index,
        text: testTexts[index],
        fileName: 'test-document.txt',
        fileType: 'txt',
        createdAt: new Date().toISOString(),
      },
    }));

    // Upsert vectors
    await upsertVectors(vectors);
    console.log(`✅ Vectors upserted to Pinecone: ${vectors.length} vectors`);

    // Query vectors
    const queryText = 'What is artificial intelligence?';
    const queryEmbedding = await generateEmbeddings(queryText);
    const results = await queryVectors(queryEmbedding, 2);

    console.log(`✅ Query successful: Found ${results.length} similar vectors`);
    results.forEach((result, index) => {
      console.log(`   Result ${index + 1}: Score ${result.score.toFixed(4)}, Text: "${result.metadata.text}"`);
    });

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Pinecone operations failed:', error instanceof Error ? error.message : error);
  }
}

// Run tests
testEmbeddings().catch(console.error);
