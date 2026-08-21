import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Protege todas as páginas exceto rotas de API (cada uma valida a sua
  // própria sessão), assets estáticos do Next.js e o favicon.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
