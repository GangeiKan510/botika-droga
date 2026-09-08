import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-8 px-4 py-12">
      <div>
        <p className="text-4xl font-semibold tracking-tight text-teal-900">
          StockRx
        </p>
        <p className="mt-2 text-teal-800/80">
          Sign in to track stock in/out and sales from cashier reports.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
