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

                const user = await prisma.user.findUnique({
                    where: { username: usernameInput },
                });

                if (!user || !user.password || user.isActive === false) return null;

                const isValid = await bcrypt.compare(passwordInput, user.password);

                if (!isValid) return null;

                return {
                    id: String(user.id),
                    name: user.nama,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                // Simpan role di JWT token untuk middleware RBAC
                token.role = user.role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.role = token.role as Role;
                // session.user.id = token.id as string;
                session.user.id = (token.id as string) || (token.sub as string);
            }
            return session;
        },
    },
});