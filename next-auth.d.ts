import { DefaultSession } from "next-auth";
import { Role } from "@/generated/prisma";

declare module "next-auth" {
    interface User {
        role: Role;
        id: string;
        username?: string;
    }

    interface Session {
        user: {
            role: Role;
            id: string;
            username?: string;
        } & DefaultSession["user"];
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: Role;
        id: string;
        username?: string;
    }
}
