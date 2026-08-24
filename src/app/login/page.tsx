import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Finanças</h1>
          <p className="text-sm text-muted-foreground">Entre com seu e-mail e senha.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
