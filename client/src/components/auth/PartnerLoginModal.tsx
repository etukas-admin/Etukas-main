import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Handshake,
  KeyRound,
  Lock,
  LogIn,
  ShieldCheck,
  UserRound,
  X
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { marketplaceApi, type User } from "../../services/api";

interface PartnerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterClick?: () => void;
}

export function PartnerLoginModal({
  isOpen,
  onClose,
  onRegisterClick
}: PartnerLoginModalProps) {
  const navigate = useNavigate();

  // Form states
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password reset mode states
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setErrorMessage(null);
      setResetErrorMessage(null);
      setResetSuccessMessage(null);
      setIsResetMode(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Login Mutation
  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!identifier.trim()) throw new Error("Please enter your Partner ID, Email, or Mobile");
      if (!password) throw new Error("Please enter your password");
      return marketplaceApi.login({
        identifier: identifier.trim(),
        password
      });
    },
    onSuccess: (user: User) => {
      onClose();
      // Direct partners directly to the partner dashboard
      if (user.roles.includes("SELLER") || user.roles.includes("PARTNER")) {
        navigate("/seller");
      } else if (user.roles.includes("ADMIN")) {
        navigate("/admin");
      } else {
        navigate("/seller");
      }
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || "Failed to sign in. Please verify your credentials.");
    }
  });

  // Reset Mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!resetIdentifier.trim()) {
        throw new Error("Please enter your Email, Partner ID, or Mobile number");
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
      setIdentifier(resetIdentifier.trim());
      setTimeout(() => {
        setIsResetMode(false);
        setResetSuccessMessage(null);
      }, 2500);
    },
    onError: (err: Error) => {
      setResetErrorMessage(err.message);
    }
  });

  const handleQuickFill = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setErrorMessage(null);
  };

  const handleSubmitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    loginMutation.mutate();
  };

  const handleRegisterRedirect = () => {
    onClose();
    if (onRegisterClick) {
      onRegisterClick();
    } else {
      const regEl = document.getElementById("partner-registration");
      if (regEl) {
        regEl.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate("/partner-hub");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-modal-title"
    >
      {/* Dark backdrop with blur */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Popup Window Container */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900 text-white shadow-2xl transition-all">
        {/* Top Header Bar */}
        <div className="relative border-b border-slate-800 bg-slate-950 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/etukas-partner-logo.png"
                alt="Etukas Partner"
                className="h-9 w-auto object-contain brightness-110"
              />
              <span className="rounded-full bg-orange-500/20 px-2.5 py-0.5 text-[11px] font-bold text-orange-400 border border-orange-500/30">
                Partner Portal
              </span>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="Close sign in popup"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {!isResetMode ? (
            /* --- PARTNER SIGN IN FORM --- */
            <form onSubmit={handleSubmitLogin} className="space-y-4">
              <div>
                <h3
                  id="partner-modal-title"
                  className="text-xl font-black tracking-tight text-white sm:text-2xl"
                >
                  Sign In to Partner Dashboard
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Enter your Partner ID (e.g. <strong>SEA01234</strong>), registered email, or mobile.
                </p>
              </div>

              {/* Identifier Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Partner ID / Email / Mobile
                </label>
                <div className="relative mt-1.5">
                  <UserRound
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. SEA01234 or seller.demo@etukas.local"
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800/90 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setResetIdentifier(identifier);
                      setErrorMessage(null);
                    }}
                    className="text-xs font-semibold text-orange-400 hover:text-orange-300 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800/90 pl-10 pr-11 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-300">
                  {errorMessage}
                </div>
              )}

              {/* Sign In CTA */}
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:opacity-95 transition-all disabled:opacity-50"
              >
                <LogIn size={17} />
                <span>{loginMutation.isPending ? "Authenticating..." : "Sign in to Dashboard"}</span>
              </button>

              {/* Quick Fill Demo for testing */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Quick Demo Account:
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFill("seller.demo@etukas.local", "Etukas@123")}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-orange-500 hover:text-orange-400 transition-colors"
                  >
                    Demo Partner (Sai Traders)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill("admin.demo@etukas.local", "Etukas@123")}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-orange-500 hover:text-orange-400 transition-colors"
                  >
                    Demo Admin
                  </button>
                </div>
              </div>

              {/* Footer Switch to Register */}
              <div className="border-t border-slate-800 pt-4 text-center text-xs text-slate-400">
                New to Etukas Partner Network?{" "}
                <button
                  type="button"
                  onClick={handleRegisterRedirect}
                  className="font-bold text-orange-400 hover:text-orange-300 hover:underline"
                >
                  Become an Etukas Partner
                </button>
              </div>
            </form>
          ) : (
            /* --- PASSWORD RESET FORM --- */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(false);
                    setResetErrorMessage(null);
                    setResetSuccessMessage(null);
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h3 className="text-lg font-bold text-white">Reset Partner Password</h3>
                  <p className="text-xs text-slate-400">Update your account password</p>
                </div>
              </div>

              {resetSuccessMessage ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
                  <h4 className="mt-2 text-sm font-bold text-emerald-300">Password Updated!</h4>
                  <p className="mt-1 text-xs text-emerald-200">{resetSuccessMessage}</p>
                  <p className="mt-2 text-xs text-slate-400">Returning to sign in...</p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    resetMutation.mutate();
                  }}
                  className="space-y-3.5"
                >
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Partner ID / Email / Mobile
                    </label>
                    <input
                      type="text"
                      required
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="Enter registered Partner ID or Email"
                      className="mt-1.5 h-11 w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      New Password
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        type={showResetPassword ? "text" : "password"}
                        required
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800/90 pl-3.5 pr-11 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      >
                        {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Confirm New Password
                    </label>
                    <input
                      type={showResetPassword ? "text" : "password"}
                      required
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="mt-1.5 h-11 w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  {resetErrorMessage && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-300">
                      {resetErrorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={resetMutation.isPending}
                    className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-sm font-bold text-white hover:bg-orange-500 transition-colors disabled:opacity-50"
                  >
                    <KeyRound size={17} />
                    <span>{resetMutation.isPending ? "Updating..." : "Update Password"}</span>
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setIsResetMode(false)}
                      className="text-xs font-bold text-slate-400 hover:text-white"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
