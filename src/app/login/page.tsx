import LoginForm from "@/components/LoginForm";

interface Props {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl } = await searchParams;

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

        <LoginForm callbackUrl={callbackUrl ?? "/"} />
      </div>
    </div>
  );
}
