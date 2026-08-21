import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Configuração "leve" do Auth.js, sem providers que dependam do Prisma.
 * É usada pelo middleware (que corre no Edge Runtime e não pode aceder
 * diretamente à base de dados) — a configuração completa está em `auth.ts`.
 *
 * Os callbacks `jwt`/`session` vivem aqui (e não só em `auth.ts`) porque o
 * middleware usa a sua PRÓPRIA instância do NextAuth construída a partir
 * desta config — sem eles aqui, o `auth.user.role` chegaria `undefined`
 * ao callback `authorized` mesmo com o token já assinado corretamente.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.validatorCheckpointIds = user.validatorCheckpointIds;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as Role;
        session.user.validatorCheckpointIds = token.validatorCheckpointIds as string[];
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isOnLogin = pathname.startsWith("/login");

      if (isOnLogin) {
        // Já autenticado e a tentar aceder ao login → manda para o dashboard.
        if (isLoggedIn) return Response.redirect(new URL("/", request.nextUrl));
        return true;
      }

      if (!isLoggedIn) return false;

      // A gestão de Utilizadores é exclusiva do ADMIN.
      if (pathname.startsWith("/users") && auth.user.role !== "ADMIN") {
        return Response.redirect(new URL("/", request.nextUrl));
      }

      return true;
    },
  },
  providers: [], // preenchido em auth.ts (precisa do Prisma / bcrypt, Node runtime)
} satisfies NextAuthConfig;
