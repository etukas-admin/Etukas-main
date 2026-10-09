import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { registerSchema, type RegisterInput } from "@etukas/shared";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { marketplaceApi } from "../../services/api";

type CustomerRegisterInput = Omit<RegisterInput, "role">;

export function RegisterPage() {
  const form = useForm<CustomerRegisterInput>({ resolver: zodResolver(registerSchema.omit({ role: true })), defaultValues: { name: "", email: "", mobile: "", password: "" } });
  const register = useMutation({ mutationFn: marketplaceApi.register });

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <form onSubmit={form.handleSubmit((values) => register.mutate(values))} className="rounded-md border border-gray-100 p-6">
        <h1 className="text-2xl font-extrabold">Create customer account</h1>
        {(["name", "email", "mobile", "password"] as const).map((field) => (
          <label key={field} className="mt-4 block text-sm font-semibold capitalize">
            {field}
            <Input className="mt-2" type={field === "password" ? "password" : field === "email" ? "email" : "text"} {...form.register(field)} />
            <span className="mt-1 block text-sm normal-case text-etukas-red">{form.formState.errors[field]?.message}</span>
          </label>
        ))}
        {register.isSuccess ? <p className="mt-4 rounded-md bg-green-50 p-3 text-sm text-etukas-green">Account created. You can now sign in.</p> : null}
        {register.error ? <p className="mt-4 rounded-md bg-etukas-pink p-3 text-sm text-etukas-red">{register.error.message}</p> : null}
        <Button className="mt-6 w-full" disabled={register.isPending}>
          <UserPlus size={18} /> Register
        </Button>
      </form>
    </main>
  );
}
