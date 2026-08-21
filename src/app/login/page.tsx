import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

interface Props {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl, error } = await searchParams;

  async function authenticate(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const dest = String(formData.get("callbackUrl") || "/");

    try {
      await signIn("credentials", { email, password, redirectTo: dest });
    } catch (err) {
      if (err instanceof AuthError) {
        const message =
          err.type === "CredentialsSignin"
            ? "Email ou password incorretos."
            : "Não foi possível iniciar sessão. Tenta novamente.";
        redirect(`/login?error=${encodeURIComponent(message)}&callbackUrl=${encodeURIComponent(dest)}`);
      }
      throw err;
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
              <path
                d="M4 7l8-4 8 4-8 4-8-4zm0 0v10l8 4m0-14v14m8-14v10l-8 4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 className="text-xl font-bold text-gray-900">MoveControl</h1>
          <p className="text-sm text-gray-500">Inicia sessão para gerir o rastreio de equipamentos.</p>
        </div>

        <form action={authenticate} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(error)}</p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@empresa.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Password</label>
            <input
              required
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
