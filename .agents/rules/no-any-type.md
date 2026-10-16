---
trigger: always_on
---

Markdown
# ANTI-GRAVITY RULES: STRICT TYPE SAFETY & BEST PRACTICES

## 🚨 CORE MANDATE
The use of the `any` type IN ANY FORM IS STRICTLY PROHIBITED. The `any` type completely disables TypeScript’s type safety checks, degrades IDE auto-completion, and introduces hidden runtime failures.

---

## 🚫 RESTRICTIONS (STRICTLY FORBIDDEN)
1. **NEVER** use the `any` keyword in:
   - Function parameters: `(data: any) => ...`
   - Function return types: `(): any => ...`
   - Variable declarations: `const result: any = ...`
   - Type assertions / explicit casting: `(response as any).data`
2. **NEVER** mask `any` behind custom type aliases (e.g., `type DynamicData = any;`).
3. **NEVER** bypass TypeScript checks using `// @ts-ignore` or `// @ts-nocheck` to bypass type safety errors.

---

## ✅ APPROVED TYPE SAFE PATTERNS

### 1. Catch Block Error Handling (Type Narrowing)
Variables in `catch` blocks are implicitly typed as `unknown`. Safely extract error messages using `instanceof Error` with a fallback string cast.

```typescript
// ❌ BAD: Avoid explicit 'any' typing
try {
  // operation
} catch (error: any) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}

// ✅ GOOD: Type safe error extraction
try {
  // operation
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  return NextResponse.json(
    { success: false, error: errorMessage },
    { status: 500 }
  );
}
2. Truly Unknown Dynamic Data
For external API payloads or raw inputs, use unknown and perform strict runtime checks before consumption.

TypeScript
// ❌ BAD
function processPayload(payload: any) {
  console.log(payload.id);
}

// ✅ GOOD
function processPayload(payload: unknown) {
  if (typeof payload === "object" && payload !== null && "id" in payload) {
    const data = payload as { id: string };
    console.log(data.id);
  }
}
3. Dynamic Key-Value Objects
For flexible dictionary objects, use Record<string, T> instead of any.

TypeScript
// ❌ BAD
const config: any = { env: "production", debug: false };

// ✅ GOOD
const config: Record<string, string | boolean> = {
  env: "production",
  debug: false,
};
4. Reusable Generic Functions
Use TypeScript Generics (<T>) to enforce strong types across flexible function interfaces.

TypeScript
// ❌ BAD
async function fetcher(url: string): Promise<any> {
  const res = await fetch(url);
  return res.json();
}

// ✅ GOOD
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return res.json() as Promise<T>;
}