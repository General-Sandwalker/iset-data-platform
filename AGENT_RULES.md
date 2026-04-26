# AI Agent Working Rules — Observatoire Numérique Repository

> **This file is intended for AI agents / LLMs working on this codebase. Follow these rules strictly for all tasks.**

---

## 📋 General Workflow
1.  **Always start by checking PROGRESS.md** to understand current project state
2.  List open issues in the current milestone and work on them **in order**
3.  Before closing any issue:
    - ✅ Verify the application still imports correctly
    - ✅ Run any existing tests
    - ✅ Verify no breaking changes were introduced
    - ✅ The feature actually works as specified
4.  Use `gh` CLI to close issues **only after successful verification**
5.  Update PROGRESS.md accordingly when completing major milestones

---

## 🔒 Pre-Issue-Close Verification Checklist
**MANDATORY before closing ANY issue:**

```
✅ Code compiles / imports without errors
✅ No existing functionality is broken
✅ Application starts correctly
✅ Acceptance criteria are 100% met
✅ Changes follow existing code patterns and conventions
✅ Proper error handling is implemented
✅ Logging is appropriate
✅ No secrets or hardcoded values are committed
```

---

## 🛠️ Working Practices
1.  **Small atomic commits** - one logical change per commit
2.  **Follow existing code style** - match indentation, naming, patterns
3.  **Do not refactor existing working code** unless explicitly required by the issue
4.  **Preserve backward compatibility** at all times
5.  Use the task_progress checklist in every tool call to track progress
6.  Always read the full file before making modifications
7.  Test edge cases and failure scenarios

---

## 📦 Repository Structure
- `/backend` - FastAPI Python backend application
- `/web-frontend` - React/Vite frontend application (Ant Design v6)
- `/docs` - Project documentation
- `/docker-compose.yml` - Development stack

## 🚀 Starting Without Conversational Context
If you are a new agent with no prior context:

1. **Read PROGRESS.md first** — it contains the current state of all phases
2. **Run `docker compose ps`** to check if the stack is already running
3. **If not running**, start it: `docker compose up -d`
4. **Verify health**: `curl http://localhost:8000/health`
5. **List next open issue**: `gh issue list --repo General-Sandwalker/data-analysis-pipeline-iset --milestone "Phase 2 — Dynamic Data Engine" --state open`
6. **Check the issue** and begin implementation following the checklist below

---

## 🚫 Forbidden Actions
❌ Do not close an issue without verification
❌ Do not make breaking changes
❌ Do not commit secrets, API keys or credentials
❌ Do not modify gitignore, Dockerfile, or CI config without explicit instruction
❌ Do not install additional dependencies unless required by the issue
❌ Do not rewrite large sections of working code

---

## ✅ Pre-Implementation Checklist
Before writing any code for a new issue:
- [ ] Read the issue fully and understand acceptance criteria
- [ ] Check PROGRESS.md for related completed work
- [ ] Review existing code patterns in the same area
- [ ] Verify the stack is running and healthy
- [ ] Run existing tests to establish baseline: `docker compose exec backend python -m pytest tests/ -v`

## ✅ Issue Closing Procedure
**MANDATORY WORKFLOW FOR EVERY ISSUE:**
1.  Complete implementation following acceptance criteria
2.  Run verification checks and verify no breaking changes
3.  Test feature works correctly
4.  **ALWAYS close the issue immediately with `gh issue close <number>`**
5.  Include detailed completion comment explaining what was implemented
6.  Update PROGRESS.md to mark issue as completed

**Issue must be closed before moving to the next issue.**

for every issue there must be a commit and then pushed after the code is tested and it works and doesn't break anything
---

*Last updated: 2026-04-23*