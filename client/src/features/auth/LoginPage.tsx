import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserCheck
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { loginSchema, type LoginInput } from "@etukas/shared";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { marketplaceApi } from "../../services/api";

export function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  // Password reset form state
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: ""
    }
  });

  const login = useMutation({
    mutationFn: async (values: LoginInput) => {
      const payload = {
        identifier: values.identifier || values.email,
        password: values.password
      };
      return marketplaceApi.login(payload);
    },
    onSuccess: (user) => {
      if (user.roles.includes("ADMIN")) navigate("/admin");
      else if (user.roles.includes("SELLER")) navigate("/seller");
      else navigate("/customer");
    }
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!resetIdentifier.trim()) {
        throw new Error("Please enter your registered Email or Mobile number");
      }
      if (resetNewPassword.length < 6) {
        throw new Error("New password must be at least 6 characters");
      }
      if (resetNewPassword !== resetConfirmPassword) {
        throw new Error("Passwords do not match");
      }
      return marketplaceApi.resetPassword({
        identifier: resetIdentifier.trim(),
        newPassword: resetNewPassword
      });
    },
    onSuccess: (data) => {
      setResetSuccessMessage(data.message || "Password updated successfully!");
      setResetErrorMessage(null);
      form.setValue("identifier", resetIdentifier.trim());
      setTimeout(() => {
        setIsResetMode(false);
        setResetSuccessMessage(null);
      }, 2500);
    },
    onError: (err: Error) => {
      setResetErrorMessage(err.message);
    }
  });

  const handleQuickFill = (identifier: string, pass: string) => {
    form.setValue("identifier", identifier);
    form.setValue("password", pass);
  };

  return (
    <main className="mx-auto grid min-h-[75vh] max-w-6xl items-center gap-12 px-4 py-12 md:grid-cols-2 lg:px-8">
      {/* Left Promo / Branding Column for Customer Buyers */}
      <section className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1 text-xs font-bold text-etukas-red">
          <ShoppingBag size={16} /> Etukas Customer Account
        </div>

        <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
          Sign in to your <span className="text-etukas-red">Customer Account</span>
        </h1>

        <p className="text-base text-gray-600">
          Order cement, steel, bricks, electricals, and tiles directly from verified local suppliers with on-site delivery tracking.
        </p>

        {/* Customer Buyer Features */}
        <div className="space-y-3 pt-2">
          <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm">
            <div className="rounded-lg bg-red-100 p-2 text-etukas-red">
              <Truck size={20} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Direct Site Delivery</h4>
              <p className="text-xs text-gray-500">
                Heavy materials delivered safely to your construction site or renovation project.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
              <PackageCheck size={20} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Real-Time Order Tracking</h4>
              <p className="text-xs text-gray-500">
                Track order confirmation, dispatch, vehicle location, and view GST invoices instantly.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Verified Building Materials</h4>
              <p className="text-xs text-gray-500">
                100% genuine products directly from certified dealers and top brand distributors.
              </p>
            </div>
          </div>
        </div>

        {/* Demo Customer Credential */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 text-xs text-gray-600">
          <div className="font-bold uppercase tracking-wider text-gray-500 text-[11px] mb-2">
            Quick Fill Demo Account:
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill("customer.demo@etukas.local", "Etukas@123")}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:border-red-400 hover:text-etukas-red shadow-2xs transition-colors"
            >
              Demo Customer Account
            </button>
          </div>
        </div>
      </section>

      {/* Right Column: Customer Sign In Form */}
      <div className="rounded-3xl border border-gray-200/80 bg-white p-8 shadow-xl shadow-gray-100">
        {!isResetMode ? (
          /* CUSTOMER LOGIN FORM */
          <form onSubmit={form.handleSubmit((values) => login.mutate(values))} className="space-y-5">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Customer Sign In</h2>
              <p className="mt-1 text-xs text-gray-500">
                Enter your registered email address or 10-digit mobile number
              </p>
            </div>

            {/* Email / Mobile input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Email or Mobile Number
              </label>
              <Input
                className="mt-1.5 h-11"
                placeholder="e.g. name@example.com or 9876543210"
                {...form.register("identifier")}
              />
              <p className="mt-1 text-xs text-red-500">{form.formState.errors.identifier?.message}</p>
            </div>

            {/* Password input with eye view toggle */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsResetMode(true)}
                  className="text-xs font-semibold text-etukas-red hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative mt-1.5">
                <Input
                  className="h-11 pr-11"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
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

            {login.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-semibold">
                {login.error.message}
              </div>
            ) : null}

            <Button
              className="mt-2 h-11 w-full bg-etukas-red hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-500/20"
              disabled={login.isPending}
            >
              <LogIn size={18} /> {login.isPending ? "Signing in..." : "Sign in to Customer Account"}
            </Button>

            <div className="border-t border-gray-100 pt-4 text-center text-xs text-gray-500">
              New to Etukas?{" "}
              <Link to="/register" className="font-bold text-etukas-red hover:underline">
                Create Customer Account
              </Link>
            </div>
          </form>
        ) : (
          /* PASSWORD RESET FORM */
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false);
                  setResetErrorMessage(null);
                  setResetSuccessMessage(null);
                }}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-black text-gray-900">Reset Password</h2>
                <p className="text-xs text-gray-500">
                  Update your customer account password
                </p>
              </div>
            </div>

            {resetSuccessMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                <h4 className="mt-2 text-sm font-bold text-emerald-900">Password Updated!</h4>
                <p className="mt-1 text-xs text-emerald-700">{resetSuccessMessage}</p>
                <p className="mt-2 text-xs text-gray-500">Redirecting to sign in...</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  resetMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Email or Mobile Number
                  </label>
                  <Input
                    required
                    className="mt-1.5 h-11"
                    placeholder="Enter your registered Email or Mobile"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    New Password
                  </label>
                  <div className="relative mt-1.5">
                    <Input
                      required
                      type={showResetPassword ? "text" : "password"}
                      className="h-11 pr-11"
                      placeholder="At least 6 characters"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                    >
                      {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Confirm New Password
                  </label>
                  <Input
                    required
                    type={showResetPassword ? "text" : "password"}
                    className="mt-1.5 h-11"
                    placeholder="Re-type new password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                  />
                </div>

                {resetErrorMessage ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-semibold">
                    {resetErrorMessage}
                  </div>
                ) : null}

                <Button
                  className="mt-2 h-11 w-full bg-etukas-red hover:bg-red-700 text-white font-bold text-sm"
                  disabled={resetMutation.isPending}
                >
                  <KeyRound size={18} /> {resetMutation.isPending ? "Updating Password..." : "Update Password"}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetMode(false)}
                    className="text-xs font-bold text-gray-500 hover:text-gray-700"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
