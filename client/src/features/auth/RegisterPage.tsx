import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserPlus
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { registerSchema, type RegisterInput } from "@etukas/shared";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { marketplaceApi } from "../../services/api";

type CustomerRegisterInput = Omit<RegisterInput, "role">;

export function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<CustomerRegisterInput>({
    resolver: zodResolver(registerSchema.omit({ role: true })),
    defaultValues: { name: "", email: "", mobile: "", password: "" }
  });

  const register = useMutation({
    mutationFn: marketplaceApi.register,
    onSuccess: () => {
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    }
  });

  return (
    <main className="mx-auto grid min-h-[75vh] max-w-6xl items-center gap-12 px-4 py-12 md:grid-cols-2 lg:px-8">
      {/* Left Promo / Branding Column */}
      <section className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1 text-xs font-bold text-etukas-red">
          <UserPlus size={16} /> Etukas Customer Registration
        </div>

        <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
          Create your <span className="text-etukas-red">Customer Account</span>
        </h1>

        <p className="text-base text-gray-600">
          Join thousands of homeowners, contractors, and builders buying high-grade cement, TMT steel, sand, and bricks at wholesale prices.
        </p>

        {/* Benefits list */}
        <div className="space-y-3 pt-2">
          <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm">
            <div className="rounded-lg bg-red-100 p-2 text-etukas-red">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Best Local Marketplace Prices</h4>
              <p className="text-xs text-gray-500">
                Compare prices across verified dealers in your city and order online.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
              <Truck size={20} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Doorstep & Site Delivery</h4>
              <p className="text-xs text-gray-500">
                Direct vehicle delivery to your construction site with real-time tracking.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">100% Quality Guaranteed</h4>
              <p className="text-xs text-gray-500">
                Authorized brand distributors with genuine test certificates & GST invoices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Right Column: Registration Form */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-8 shadow-xl shadow-gray-100">
        <form onSubmit={form.handleSubmit((values) => register.mutate(values))} className="space-y-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Create Account</h2>
            <p className="mt-1 text-xs text-gray-500">
              Fill in your details to start ordering building materials
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Full Name
            </label>
            <Input
              className="mt-1.5 h-11"
              placeholder="e.g. Ramesh Varma"
              {...form.register("name")}
            />
            <p className="mt-1 text-xs text-red-500">{form.formState.errors.name?.message}</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Email Address
            </label>
            <Input
              className="mt-1.5 h-11"
              type="email"
              placeholder="e.g. ramesh@example.com"
              {...form.register("email")}
            />
            <p className="mt-1 text-xs text-red-500">{form.formState.errors.email?.message}</p>
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              10-Digit Mobile Number
            </label>
            <Input
              className="mt-1.5 h-11"
              placeholder="e.g. 9876543210"
              {...form.register("mobile")}
            />
            <p className="mt-1 text-xs text-red-500">{form.formState.errors.mobile?.message}</p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Password
            </label>
            <div className="relative mt-1.5">
              <Input
                type={showPassword ? "text" : "password"}
                className="h-11 pr-11"
                placeholder="At least 8 characters"
                {...form.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-red-500">{form.formState.errors.password?.message}</p>
          </div>

          {register.isSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3.5 text-xs font-bold text-green-700 border border-green-200">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>Account created successfully! Redirecting to sign in...</span>
            </div>
          )}

          {register.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
              {register.error.message}
            </div>
          )}

          <Button
            className="mt-2 h-11 w-full bg-etukas-red hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-500/20"
            disabled={register.isPending}
          >
            <UserPlus size={18} /> {register.isPending ? "Creating Account..." : "Create Customer Account"}
          </Button>

          <div className="border-t border-gray-100 pt-4 text-center text-xs text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-etukas-red hover:underline">
              Sign in to Customer Account
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
