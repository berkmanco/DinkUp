# New Feature Development Process

Follow this checklist for every new feature to ensure quality and consistency.

---

## 1. Create Feature Branch
```bash
git checkout -b feature/feature-name
```
Use descriptive branch names: `feature/edit-session`, `feature/payment-reminders`, etc.

---

## 2. Implement Feature
- Write production code
- Follow existing patterns and conventions
- Keep changes focused on the single feature

---

## 3. Add Tests
Add tests to appropriate test file in `/tests`:
```bash
# Edit the relevant test file
# - tests/sessions.test.ts
# - tests/pools.test.ts
# - tests/payments.test.ts
# - etc.
```

---

## 4. Run Tests
```bash
npm test
```
Verify all tests pass, including new ones.

---

## 5. Update Documentation
- Create feature doc in `/docs` if needed (e.g., `docs/FEATURE_NAME.md`)
- Update relevant existing docs
- Update `FEATURE_STATUS.md` with the new feature

---

## 6. Commit Changes
```bash
# Stage relevant files (don't include unrelated changes)
git add src/ tests/ docs/ FEATURE_STATUS.md

# Write descriptive commit message
git commit -m "Add [feature name]

- Key change 1
- Key change 2
- Key change 3"
```

**Commit Message Format:**
- First line: Brief summary (50 chars)
- Blank line
- Bullet points describing what changed

---

## 7. Create Pull Request
```bash
# Push branch to origin
git push -u origin feature/feature-name

# Create PR using gh CLI
gh pr create --title "Add [feature name]" --body "$(cat <<'EOF'
## Summary
Brief description of what this feature does.

## Changes
- List of key changes
- ...

## Testing
- Describe how to test
- List test coverage added

## Screenshots (if applicable)
[Add screenshots]
EOF
)"
```

Or create PR manually on GitHub.

---

## 8. Deploy
After PR is approved and merged:
```bash
# Vercel auto-deploys from main branch
# Monitor deployment at https://vercel.com/your-project
```

---

## Quick Reference
```bash
# Full workflow in one go:
git checkout -b feature/my-feature
# ... implement ...
npm test
git add .
git commit -m "Add my feature"
git push -u origin feature/my-feature
gh pr create --title "Add my feature" --body "Description here"
```
