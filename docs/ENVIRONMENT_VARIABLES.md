# Environment Variables Guide

This document explains how environment variables are handled in this project.

## Overview

This project uses a **two-tier approach** for environment variable loading:

1. **Next.js Runtime** (app code, API routes, server components): Environment variables are automatically loaded by Next.js from `.env.local` and `.env` files. No manual loading needed.

2. **Standalone Scripts** (test scripts, build scripts, etc.): Must explicitly load environment variables using the `scripts/load-env.ts` utility.

## Environment Files

The project looks for environment variables in this order (later files override earlier ones):

1. `.env.local` - Local development overrides (gitignored)
2. `.env` - Default environment variables (can be committed)

## Required Environment Variables

### Database

- `DATABASE_URL` - PostgreSQL connection string

### OpenAI

- `OPENAI_API_KEY` - OpenAI API key for embeddings and LLM

### Pinecone

- `PINECONE_API_KEY` - Pinecone API key
- `PINECONE_INDEX` - Pinecone index name

### AWS S3

- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (defaults to `us-east-1`)
- `S3_BUCKET_NAME` - S3 bucket name for file storage

### Better Auth

- `BETTER_AUTH_SECRET` - Secret key for Better Auth
- `BETTER_AUTH_URL` - Base URL for Better Auth

### OAuth Providers (Optional but Recommended)

The following OAuth providers are supported for one-click social authentication:

#### Google OAuth

- `GOOGLE_CLIENT_ID` - Google OAuth 2.0 Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth 2.0 Client Secret

**Setup Instructions:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client IDs**
5. Set **Authorized Redirect URIs**:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
6. Copy the Client ID and Client Secret to your `.env.local`

#### GitHub OAuth

- `GITHUB_CLIENT_ID` - GitHub OAuth App Client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth App Client Secret

**Setup Instructions:**

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click **New OAuth App**
3. Set **Authorization callback URL**:
   - Development: `http://localhost:3000/api/auth/callback/github`
   - Production: `https://yourdomain.com/api/auth/callback/github`
4. Copy the Client ID and Client Secret to your `.env.local`

#### Microsoft OAuth

- `MICROSOFT_CLIENT_ID` - Microsoft Azure App Registration Client ID
- `MICROSOFT_CLIENT_SECRET` - Microsoft Azure App Registration Client Secret
- `MICROSOFT_TENANT_ID` - Microsoft Tenant ID (defaults to `common` if not set)

**Setup Instructions:**

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Set **Redirect URI**:
   - Development: `http://localhost:3000/api/auth/callback/microsoft`
   - Production: `https://yourdomain.com/api/auth/callback/microsoft`
5. Copy the Application (client) ID and create a client secret
6. Copy the Tenant ID (or use `common` for multi-tenant)
7. Add values to your `.env.local`

**Note:** OAuth providers are optional. If credentials are not provided, the social login buttons will still appear but authentication will fail. You can remove providers you don't want to use by not setting their credentials.

## Usage Patterns

### In Next.js Code (Automatic)

No special handling needed - Next.js loads env vars automatically:

```typescript
// app/api/documents/route.ts
export async function GET() {
  // process.env.OPENAI_API_KEY is automatically available
  const apiKey = process.env.OPENAI_API_KEY;
}
```

### In Standalone Scripts (Manual Loading)

Import the env loader at the top of your script:

```typescript
// scripts/my-script.ts
import './load-env'; // Load env vars first

import { generateEmbeddings } from '../lib/ai/embeddings';
// Now process.env is populated
```

### In Config Files (Build-Time)

Config files like `drizzle.config.ts` run at build time, so they need explicit loading:

```typescript
// drizzle.config.ts
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '.env.local') });
config({ path: resolve(__dirname, '.env') });

export default defineConfig({
  // ...
});
```

## Best Practices

1. **Never commit `.env.local`** - It contains sensitive credentials
2. **Use `.env` for non-sensitive defaults** - Can be committed to version control
3. **Always load env vars first in scripts** - Before any imports that use `process.env`
4. **Use typed env getters** - Consider using `lib/env.ts` for type-safe access (optional)

## Troubleshooting

### "Environment variable is not set" error

1. Check that `.env.local` exists in the project root
2. Verify the variable name matches exactly (case-sensitive)
3. For scripts: Ensure you've imported `./load-env` at the top
4. Restart your development server after changing `.env.local`

### Variables not loading in scripts

Make sure you import the loader **before** any other imports:

```typescript
// ✅ Correct
import './load-env';
import { someFunction } from '../lib/something';

// ❌ Wrong - imports happen before env loading
import { someFunction } from '../lib/something';
import './load-env';
```

## Example: Creating a New Script

```typescript
// scripts/process-documents.ts

// 1. Load environment variables first
import './load-env';

// 2. Then import your dependencies
import { generateEmbeddings } from '../lib/ai/embeddings';
import { chunkDocument } from '../lib/ai/chunking';

// 3. Use process.env as needed
async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required');
  }

  // Your script logic here
}

main().catch(console.error);
```
