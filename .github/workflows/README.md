# CI/CD Workflows

This directory contains GitHub Actions workflows for automated testing and deployment.

## Workflows

### 1. `ci.yml` - Full CI/CD Pipeline

**When it runs:**

- On push to `main` or `develop` branches
- On pull requests to `main` or `develop`

**What it does:**

1. Lint & Type Check (5 min)
2. Unit Tests (10 min)
3. Integration Tests (15 min)
4. Build Check (10 min)
5. E2E Tests (20 min) - Only if others pass
6. Security Scan (5 min)

**Total time:** ~15-20 minutes (with parallel execution)

### 2. `quick-check.yml` - Fast Feedback

**When it runs:**

- On push to feature branches (not main/develop)
- On pull requests

**What it does:**

1. Lint & Type Check
2. Unit Tests
3. Build Check

**Total time:** ~2-3 minutes

**Why:** Fast feedback for developers without waiting for slow E2E tests.

## Setup Instructions

### 1. **No Secrets Required!**

**Good news:** Our workflow is designed to work **without any secrets**!

- Tests use mocks and test containers
- No production API keys needed
- Safe for open-source repositories

**If you want to add optional features later:**

- Only add test account secrets (not production)
- Only add to specific jobs that need them

### 2. Test the Workflow

1. Push a commit to a feature branch
2. Check the "Actions" tab in GitHub
3. Watch the workflow run

### 3. Required Status Checks (Optional)

To require tests to pass before merging:

1. Go to **Settings → Branches**
2. Add branch protection rule for `main`
3. Require status checks:
   - `lint-and-typecheck`
   - `unit-tests`
   - `integration-tests`
   - `build`
   - `e2e-tests` (optional - can be slow)

## Workflow Strategy

### For Feature Branches

- Use `quick-check.yml` for fast feedback
- Run full `ci.yml` only before merging

### For Main/Develop

- Always run full `ci.yml`
- All tests must pass before deployment

## Troubleshooting

### Tests fail in CI but pass locally?

- Check environment variables are set
- Check services (PostgreSQL, Redis) are running
- Check for race conditions
- Check timeouts are sufficient

### E2E tests too slow?

- They only run on main/develop and PRs
- Only Chromium runs in CI (faster than all browsers)
- Consider splitting into critical vs. non-critical tests

### Need to skip CI?

Add `[skip ci]` to your commit message:

```bash
git commit -m "Update README [skip ci]"
```
