---
name: wrapup-skill
description: Helps wrap up the session. Use only when told to do so.
---

# Wrapup Skill

Instructions for wrapup skill:

- Check all code changes (both modifications and newly added files) to see if we left any redundant code.
- Check all changes with "prettier" also to make sure it's all adhering to our coding standards.
- Check "rules" folder in the .agents folder to see if we should update anything there.
- Review the overarching goals of the session and the full scope of added features to avoid "summary tunnel-vision" (do not just focus on the final bug fixes).
- **Mandatory Git Diff Check**: Always run `git diff main` to objectively identify fundamental changes.
- **Output a comprehensive commit message** for these changes but don't commit them.
  - **No Session Noise**: Do NOT mention "fixes" for bugs, regressions, or broken states that were introduced and resolved within the same session.
  - **No "Restorations"**: Avoid mentioning "restoring" functionality that was accidentally broken during development.
  - IMPORTANT: Do NOT include markdown links, rich-text links, or `file:///` URIs in the commit message. Just use plain text filenames (e.g., `filename.ts`).

## When to use this skill

- Use this when I ask you to wrap up the session.

## How to use it

- Check all code changes (both modifications and newly added files) to see if we left any redundant code.
- Check all changes with "prettier" also to make sure it's all adhering to our coding standards.
- Check "rules" folder in the .agents folder to see if we should update anything there.
- **Run `git diff main`** to objectively verify the session's technical output.
- Review the goals to avoid "summary tunnel-vision".
- **Draft the commit message** focusing on the intentional feature set and architectural changes, while strictly scrubbing any mention of session-internal bug fixing or "restorations".
  - IMPORTANT: Do NOT include markdown links, rich-text links, or `file:///` URIs in the commit message. Just use plain text filenames (e.g., `filename.ts`), but don't summarize files changed in bottom of commit message.
