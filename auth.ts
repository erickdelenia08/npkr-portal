// auth.ts (NextAuth v5 Configuration)
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

import { PrismaAdapter } from "@auth/prisma-adapter";
import { Role } from "@/generated/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
    // debug: true,
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    providers: [
        // 1. Provider Google
        Google({
            clientId: process.env.AUTH_GOOGLE_ID as string,
            clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
        }),
        // 2. Provider Password (untuk Admin / User non-Gmail)
        Credentials({
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const usernameInput = credentials?.username as string | undefined;
                const passwordInput = credentials?.password as string | undefined;

                if (!usernameInput || !passwordInput) return null;

                const trimmed = usernameInput.trim();
                const normalized = trimmed.toLowerCase();

                // Support case-insensitive query fallback
                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { username: normalized },
                            { username: trimmed },
                        ],
                    },
                });

                if (!user || !user.password || user.isActive === false) return null;

                const isValid = await bcrypt.compare(passwordInput, user.password);

                if (!isValid) return null;

                return {
                    id: String(user.id),
                    name: user.nama,
                    role: user.role,
                    username: user.username,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.name = user.name;
                if ("username" in user && typeof user.username === "string") {
                    token.username = user.username;
                }
            }

            // Secure session refresh mechanism:
            // When trigger === "update", fetch verified profile values directly from database
            // using token.id. Prevents client-side manipulation of roles or IDs.
            if (trigger === "update" && token.id) {
                const userId = Number(token.id);
                if (Number.isSafeInteger(userId) && userId > 0) {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { nama: true, username: true, role: true, isActive: true },
                    });

                    if (dbUser && dbUser.isActive) {
                        token.name = dbUser.nama;
                        token.username = dbUser.username;
                        token.role = dbUser.role;
                    }
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.role = token.role as Role;
                session.user.id = (token.id as string) || (token.sub as string);
                if (token.name) {
                    session.user.name = token.name as string;
                }
                if (token.username) {
                    session.user.username = token.username as string;
                }
            }
            return session;
        },
    },
});
