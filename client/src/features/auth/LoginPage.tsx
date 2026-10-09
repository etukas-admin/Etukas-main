import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { loginSchema, type LoginInput } from "@etukas/shared";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { marketplaceApi } from "../../services/api";
import { isDemoLoginEnabled, loginDemoAccount } from "./demoAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "customer.demo@etukas.local", password: "Etukas@123" } });
  const login = useMutation({
    mutationFn: async (values: LoginInput) => isDemoLoginEnabled ? loginDemoAccount(values) : marketplaceApi.login(values),
    onSuccess: (user) => {
      if (user.roles.includes("ADMIN")) navigate("/admin");
      else if (user.roles.includes("SELLER")) navigate("/seller");
      else navigate("/customer");
    }
  });

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 lg:px-6">
      <section>
        <p className="text-sm font-bold uppercase text-etukas-red">Secure account access</p>
        <h1 className="mt-2 text-3xl font-extrabold">Sign in to manage orders, carts, and seller tools.</h1>
        <p className="mt-4 text-gray-600">
          {isDemoLoginEnabled
            ? "Demo login is enabled locally. Database-backed features are unavailable in this mode."
            : "Development seed users are documented in the README and are local-only."}
        </p>
      </section>
      <form onSubmit={form.handleSubmit((values) => login.mutate(values))} className="rounded-md border border-gray-100 p-6">
        <h2 className="text-xl font-bold">Login</h2>
        <label className="mt-5 block text-sm font-semibold">
          Email
          <Input className="mt-2" type="email" {...form.register("email")} />
        </label>
        <p className="mt-1 text-sm text-etukas-red">{form.formState.errors.email?.message}</p>
        <label className="mt-4 block text-sm font-semibold">
          Password
          <Input className="mt-2" type="password" {...form.register("password")} />
        </label>
        <p className="mt-1 text-sm text-etukas-red">{form.formState.errors.password?.message}</p>
        {login.error ? <p className="mt-4 rounded-md bg-etukas-pink p-3 text-sm text-etukas-red">{login.error.message}</p> : null}
        <Button className="mt-6 w-full" disabled={login.isPending}>
          <LogIn size={18} /> {login.isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
