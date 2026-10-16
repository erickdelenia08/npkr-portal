---
trigger: always_on
---

# NEXT.JS PERFORMANCE & OPTIMIZATION RULES

## 🚨 CORE MANDATE
All UI components MUST leverage built-in Next.js optimization tools. Native HTML tags (`<img>`, `<a>`) that bypass Next.js optimizations, degrade LCP (Largest Contentful Paint), or trigger full page reloads ARE STRICTLY PROHIBITED.

---

## 🚫 RESTRICTIONS (STRICTLY FORBIDDEN)

1. **NEVER** use standard `<img>` tags for rendering images.
2. **NEVER** use standard `<a>` tags for internal navigation between routes.
3. **NEVER** import external fonts via standard `<link>` tags in `<head>` or `@import` in CSS.
4. **NEVER** import large libraries synchronously if they are non-critical for the initial page load. Use dynamic imports instead.

---

## ✅ REQUIRED OPTIMIZATION PATTERNS

### 1. Image Optimization (`next/image`)
Always use the `<Image />` component from `next/image` to enable automatic lazy loading, modern format conversion (WebP/AVIF), and responsive sizing.

```tsx
// ❌ BAD: Standard img tag (Bypasses image optimization pipeline)
<img src="/logo.png" alt="CRM Logo" width={100} height={50} />

// ✅ GOOD: Using next/image for static/local assets
import Image from "next/image";

<Image 'priority' / // LCP ONLY Use above-the-fold alt="CRM Logo" elements for height="{50}" priority src="/logo.png" width="{100}"/>

// ✅ GOOD: Using next/image for dynamic/remote assets (e.g., MinIO/S3 avatars)
<Image alt="{student.name}" className="object-cover" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" src="{student.avatarUrl}"/>

Note: Ensure remote image domains (including local/cloud MinIO endpoints) are registered in next.config.ts under images.remotePatterns.

2. Navigation Optimization (next/link)
Always use the <Link /> component from next/link for internal routing to trigger background prefetching and SPA-style client transitions.

TypeScript
// ❌ BAD: Standard anchor tag (Triggers full browser page reload)
<a href="/students">View Students</a>

// ✅ GOOD: Using next/link
import Link from "next/link";

<Link className="hover:underline" href="/students">
  View Students
</Link>
3. Dynamic Imports for Heavy Components (next/dynamic)
Use next/dynamic for code-splitting heavy, non-critical client components (e.g., Modals, Charts, Rich Text Editors).

TypeScript
// ❌ BAD: Synchronously importing heavy chart libraries in Client Components
import { StudentAnalyticsChart } from "@/components/charts/student-chart";

// ✅ GOOD: Load lazily when rendered
import dynamic from "next/dynamic";

const StudentAnalyticsChart = dynamic(
  () => import("@/components/charts/student-chart"),
  { 
    ssr: false, 
    loading: () => <p className="animate-pulse">Loading Chart...</p> 
  }
);
4. Font Optimization (next/font)
Use next/font/google or next/font/local to automatically inline font CSS, optimize assets at build time, and eliminate layout shifts (FOUT).

TypeScript
// app/layout.tsx
import { Inter } from "next/font/google";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}