---
trigger: always_on
---

# UI & STYLING RULES

## 🚨 MANDATORY INSTRUCTION
Before writing any frontend code, UI components, or Tailwind styles:

👉 **YOU MUST READ AND APPLY THE DESIGN TOKENS IN `DESIGN.md`.**

All visual styles, colors, typography, border-radius, and spacing MUST strictly map to the configuration in `DESIGN.md`.

---

## 🎨 DESIGN SYSTEM ENFORCEMENT (`DESIGN.md`)

### 1. Color Palette Rules
- Primary brand text & surfaces: Use `on-surface` (`#0f172a`), `primary` (`#1e293b`), and `surface` (`#f8fafc`).
- Primary actions/buttons: Use `primary-container` (`#3b82f6` - Slate/Blue) with `on-primary-container`.
- Status indicators:
  - **Success:** `success` (`#10b981`) & `success-container` (`#d1fae5`)
  - **Error:** `error` (`#ef4444`) & `error-container` (`#fee2e2`)
  - **Warning:** `warning` (`#f59e0b`) & `warning-container` (`#fef3c7`)
  - **Info:** `info` (`#0284c7`) & `info-container` (`#e0f2fe`)

### 2. Typography Rules
- **Headings (H1, H2, H3, Headlines):** Use `Plus Jakarta Sans`.
- **Body & Labels:** Use `Inter`.
- **Code/Badges/IDs:** Use `JetBrains Mono`.

### 3. Spacing & Radius
- Card padding: `20px` (`p-5`).
- Section gap: `28px`.
- Default rounded corners: `rounded-md` (`0.75rem`) to `rounded-lg` (`1rem`).

---

## 🧱 COMPONENT & LAYOUT ARCHITECTURE

1. **Shadcn UI Primitives:** Always check and use base primitives from `@/components/ui/` (`button.tsx`, `input.tsx`, `dialog.tsx`, `table.tsx`). Customize them using Tailwind to match `DESIGN.md`.
2. **Form Layouts:** Place all form UI inside `@/components/forms/` powered by `react-hook-form` + Zod schemas.
3. **Data Tables:** Place feature tables inside `@/components/tables/` using primitive `@/components/ui/table`.
4. **Icons:** Use `lucide-react` strictly.
5. **Image & Link Optimization:** 
   - ALWAYS use `<Image />` from `next/image` (NEVER `<img>`).
   - ALWAYS use `<Link />` from `next/link` (NEVER `<a>`).