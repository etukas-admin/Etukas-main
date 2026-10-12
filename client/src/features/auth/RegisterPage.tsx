import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { registerSchema, type RegisterInput } from "@etukas/shared";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { marketplaceApi } from "../../services/api";

type CustomerRegisterInput = Omit<RegisterInput, "role">;

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<CustomerRegisterInput>({ resolver: zodResolver(registerSchema.omit({ role: true })), defaultValues: { name: "", email: "", mobile: "", password: "" } });
  const register = useMutation({ mutationFn: marketplaceApi.register });

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <form onSubmit={form.handleSubmit((values) => register.mutate(values))} className="rounded-md border border-gray-100 p-6">
        <h1 className="text-2xl font-extrabold">Create customer account</h1>
        <label className="mt-4 block text-sm font-semibold">
          Name
          <Input className="mt-2" placeholder="Full name" {...form.register("name")} />
          <span className="mt-1 block text-sm text-etukas-red">{form.formState.errors.name?.message}</span>
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Email
          <Input className="mt-2" type="email" placeholder="email@example.com" {...form.register("email")} />
          <span className="mt-1 block text-sm text-etukas-red">{form.formState.errors.email?.message}</span>
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Mobile Number
          <Input className="mt-2" placeholder="10-digit mobile" {...form.register("mobile")} />
          <span className="mt-1 block text-sm text-etukas-red">{form.formState.errors.mobile?.message}</span>
        </label>
        <div>
          <label className="mt-4 block text-sm font-semibold">Password</label>
          <div className="relative mt-2">
            <Input
              type={showPassword ? "text" : "password"}
              className="pr-10"
              placeholder="At least 8 characters"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <span className="mt-1 block text-sm text-etukas-red">{form.formState.errors.password?.message}</span>
        </div>
        {register.isSuccess ? <p className="mt-4 rounded-md bg-green-50 p-3 text-sm text-etukas-green">Account created. You can now sign in.</p> : null}
        {register.error ? <p className="mt-4 rounded-md bg-etukas-pink p-3 text-sm text-etukas-red">{register.error.message}</p> : null}
        <Button className="mt-6 w-full" disabled={register.isPending}>
          <UserPlus size={18} /> Register
        </Button>
      </form>
    </main>
  );
}
