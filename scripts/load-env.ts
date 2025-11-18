/**
 * Load environment variables for standalone scripts
 *
 * Import this at the top of any standalone script that needs environment variables:
 *   import '../scripts/load-env';
 *
 * This ensures environment variables are loaded before any other imports that depend on them.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local first (takes precedence), then .env as fallback
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });
