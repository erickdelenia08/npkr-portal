import { auth } from "@/auth";
import { NextResponse } from "next/server";

type Role =
    | "ADMIN"
    | "MARKETING"
    | "DIGITAL_MARKETING"
    | "FIELD_SUPERVISOR"
    | "MANAGER"
    | "DIRECTOR";

// ==========================================
// MAPPING DASHBOARD SPESIFIK PER ROLE
// ==========================================
const roleDashboards: Record<Role, string> = {
    ADMIN: "/admin/dashboard",
    MARKETING: "/marketing/dashboard",
    DIGITAL_MARKETING: "/digital-marketing/dashboard",
    FIELD_SUPERVISOR: "/field-supervisor/dashboard",
    MANAGER: "/manager/dashboard",
    DIRECTOR: "/director/dashboard",
};

/**
 * Route yang hanya bisa diakses oleh role tertentu.
 * Karena menggunakan arsitektur folder per role,
 * kita cukup memproteksi base path-nya saja.
 */
const protectedRoutes: Record<string, Role[]> = {
    // Admin path: Bisa diakses Admin, Manager, dan Director (untuk pengawasan)
    "/admin": ["ADMIN", "MANAGER", "DIRECTOR"],

    // Marketing path: Bisa diakses Marketing, Manager, dan Director
    "/marketing": ["MARKETING", "MANAGER", "DIRECTOR"],

    // Path lainnya sesuaikan hirarkinya
    "/digital-marketing": ["DIGITAL_MARKETING", "MANAGER", "DIRECTOR"],
    "/field-supervisor": ["FIELD_SUPERVISOR", "MANAGER", "DIRECTOR"],
    "/manager": ["MANAGER", "DIRECTOR"],
    "/director": ["DIRECTOR"],
};

/**
 * Cari permission berdasarkan pathname.
 * Contoh: /admin/pemberkasan/123 -> Cocok dengan "/admin"
 */
function getAllowedRoles(pathname: string): Role[] | undefined {
    const matchedRoute = Object.keys(protectedRoutes)
        .sort((a, b) => b.length - a.length)
        .find(
            (route) =>
                pathname === route ||
                pathname.startsWith(`${route}/`)
        );

    return matchedRoute ? protectedRoutes[matchedRoute] : undefined;
}

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const role = req.auth?.user?.role as Role | undefined;
    const pathname = nextUrl.pathname;

    const isHomeRoute = pathname === "/";
    const isLoginRoute = pathname === "/login";

    // ==========================================
    // DEBUG
    // ==========================================
    console.log("========== PROXY ==========");
    console.log("PATH:", pathname);
    console.log("isLoggedIn:", isLoggedIn);
    console.log("role:", role);
    console.log("===========================");

    // ==========================================
    // USER BELUM LOGIN
    // ==========================================
    if (!isLoggedIn) {
        // Halaman Login boleh diakses jika belum login
        if (isLoginRoute) {
            return NextResponse.next();
        }

        // Semua halaman lainnya (termasuk "/") diredirect ke login
        return NextResponse.redirect(new URL("/login", nextUrl));
    }

    // ==========================================
    // USER SUDAH LOGIN
    // ==========================================
    const validRoles: Role[] = [
        "ADMIN",
        "MARKETING",
        "DIGITAL_MARKETING",
        "FIELD_SUPERVISOR",
        "MANAGER",
        "DIRECTOR",
    ];

    // Role tidak dikenali di database
    if (!role || !validRoles.includes(role)) {
        return NextResponse.redirect(new URL("/login", nextUrl));
    }

    // Ambil target dashboard spesifik untuk role user yang login saat ini
    const userDashboard = roleDashboards[role];

    // ==========================================
    // ROOT / LOGIN → DASHBOARD ROLE MASING-MASING
    // ==========================================
    if (isHomeRoute || isLoginRoute) {
        return NextResponse.redirect(new URL(userDashboard, nextUrl));
    }

    // ==========================================
    // RBAC (Role-Based Access Control)
    // ==========================================
    const allowedRoles = getAllowedRoles(pathname);

    // Route tidak memiliki permission khusus (misal halaman publik jika ada)
    if (!allowedRoles) {
        return NextResponse.next();
    }

    // Jika Role TIDAK memiliki akses ke path ini (misal Marketing buka /admin)
    if (!allowedRoles.includes(role)) {
        // Lempar / usir kembali ke dashboard miliknya sendiri
        return NextResponse.redirect(new URL(userDashboard, nextUrl));
    }

    // Role valid dan memiliki akses, persilakan masuk
    return NextResponse.next();
});

export const config = {
    matcher: [
        // Proteksi semua path kecuali API, assets internal Next.js, dan favicon
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};