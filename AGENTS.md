# AGENT SYSTEM INSTRUCTIONS & COMMAND CENTER

## 🚨 MANDATORY RULE EXECUTION BEFORE ANY TASK
Before generating or modifying any code, you MUST read and follow the specific rule files located in `.agents/rules/`:

1. 🏗️ **Architecture & Folder Structure:**
   👉 **Read `.agents/rules/architecture.md`** for file placement (`actions/`, `schemas/`, `components/tables/`, `components/forms/`).

2. 🛡️ **Type Safety (Strict No Any):**
   👉 **Read `.agents/rules/no-any-type.md`** for TypeScript standards and error handling.

3. ⚡ **Performance & Optimizations:**
   👉 **Read `.agents/rules/performance.md`** for Next.js image, link, and dynamic import rules.

4. 🎨 **UI, Styling & Design Tokens:**
   👉 **Read `.agents/rules/ui.md`** (which mandates reading `DESIGN.md` for colors, typography, Material Design 3 tokens, and etc).


---

## 🔒 QUICK NON-NEGOTIABLE CHECKLIST
- ❌ **NO `any` TYPE:** Always use `unknown` with type narrowing.
- ❌ **NO `<img>` OR `<a>` TAGS:** Always use `next/image` and `next/link`.
- 🔑 **STRICT RBAC ENFORCEMENT:** Always check user role inside Server Actions before executing DB logic.
- 📁 **STRICT PLACEMENT:** Place actions in `actions/`, schemas in `schemas/`, form components in `components/forms/`, and data tables in `components/tables/`.