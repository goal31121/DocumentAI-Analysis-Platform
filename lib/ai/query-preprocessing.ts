/**
 * Query preprocessing utilities
 * Removes stop words, extracts keywords, and normalizes queries
 * All operations are rule-based with NO LLM cost
 */

/**
 * Common English stop words to remove from queries
 * This improves keyword matching by focusing on meaningful terms
 */
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'will',
  'with',
  'the',
  'this',
  'but',
  'they',
  'have',
  'had',
  'what',
  'said',
  'each',
  'which',
  'their',
  'if',
  'up',
  'out',
  'many',
  'then',
  'them',
  'these',
  'so',
  'some',
  'her',
  'would',
  'make',
  'like',
  'into',
  'him',
  'has',
  'two',
  'more',
  'very',
  'after',
  'words',
  'long',
  'than',
  'first',
  'been',
  'call',
  'who',
  'oil',
  'sit',
  'now',
  'find',
  'down',
  'day',
  'did',
  'get',
  'come',
  'made',
  'may',
  'part',
]);

/**
 * Preprocess a query by:
 * 1. Converting to lowercase
 * 2. Removing punctuation (keeping spaces)
 * 3. Removing stop words
 * 4. Extracting keywords
 *
 * @param query - The original query string
 * @returns Preprocessed query with keywords extracted
 */
export function preprocessQuery(query: string): {
  original: string;
  normalized: string;
  keywords: string[];
  cleaned: string; // Query with stop words removed
} {
  if (!query || typeof query !== 'string') {
    return {
      original: '',
      normalized: '',
      keywords: [],
      cleaned: '',
    };
  }

  // Step 1: Normalize - lowercase and remove extra whitespace
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');

  // Step 2: Remove punctuation but keep spaces and hyphens
  const withoutPunctuation = normalized.replace(/[^\w\s-]/g, ' ');

  // Step 3: Split into words
  const words = withoutPunctuation
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word.trim());

  // Step 4: Remove stop words and extract keywords
  const keywords = words.filter((word) => {
    const lowerWord = word.toLowerCase();
    // Keep words that:
    // - Are not stop words
    // - Are longer than 2 characters (or are numbers)
    // - Are meaningful terms
    return !STOP_WORDS.has(lowerWord) && (word.length > 2 || /^\d+$/.test(word)) && lowerWord.length > 0;
  });

  // Step 5: Create cleaned query (keywords joined)
  const cleaned = keywords.join(' ');

  return {
    original: query,
    normalized,
    keywords,
    cleaned: cleaned || normalized, // Fallback to normalized if no keywords
  };
}

/**
 * Extract key phrases from a query
 * Identifies multi-word phrases that might be important
 *
 * @param query - The query string
 * @returns Array of potential key phrases
 */
export function extractKeyPhrases(query: string): string[] {
  const preprocessed = preprocessQuery(query);
  const keywords = preprocessed.keywords;

  if (keywords.length === 0) {
    return [];
  }

  const phrases: string[] = [];

  // Extract 2-word phrases
  for (let i = 0; i < keywords.length - 1; i++) {
    phrases.push(`${keywords[i]} ${keywords[i + 1]}`);
  }

  // Extract 3-word phrases (if query is long enough)
  if (keywords.length >= 3) {
    for (let i = 0; i < keywords.length - 2; i++) {
      phrases.push(`${keywords[i]} ${keywords[i + 1]} ${keywords[i + 2]}`);
    }
  }

  return phrases;
}

/**
 * Calculate keyword match score between query keywords and text
 * This is a simple BM25-inspired scoring without full BM25 implementation
 *
 * @param queryKeywords - Keywords from the query
 * @param text - Text to match against
 * @returns Score between 0 and 1
 */
export function calculateKeywordScore(queryKeywords: string[], text: string): number {
  if (queryKeywords.length === 0 || !text) {
    return 0;
  }

  const textLower = text.toLowerCase();
  let matches = 0;
  let totalScore = 0;

  for (const keyword of queryKeywords) {
    const keywordLower = keyword.toLowerCase();
    // Count occurrences (case-insensitive)
    const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const occurrences = (textLower.match(regex) || []).length;

    if (occurrences > 0) {
      matches++;
      // Simple scoring: more occurrences = higher score (logarithmic to prevent over-weighting)
      totalScore += Math.log(1 + occurrences);
    }
  }

  if (matches === 0) {
    return 0;
  }

  // Normalize score: (matches / total keywords) * (log score / max possible)
  const matchRatio = matches / queryKeywords.length;
  const maxPossibleScore = queryKeywords.length * Math.log(10); // Assume max 10 occurrences per keyword
  const normalizedScore = Math.min(1, (totalScore / maxPossibleScore) * matchRatio);

  return normalizedScore;
}
