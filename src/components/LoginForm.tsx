import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema } from "../lib/validation.ts";
import { useAuth } from "../hooks/useAuth.ts";
import { ArrowRight, ShieldCheck, FileText, X, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

type LoginFormInputs = z.infer<typeof LoginSchema>;

interface LoginFormProps {
  onSuccess: () => void;
  onGoToRegister: () => void;
  onGoToLanding: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onGoToRegister,
  onGoToLanding
}) => {
  const { login } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      identifier: "",
      password: ""
    }
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setApiError(null);
    try {
      const payload: any = { password: data.password };
      if (data.identifier.includes("@")) {
        payload.email = data.identifier;
      } else {
        payload.phone = data.identifier;
      }
      await login(payload);
      onSuccess();
    } catch (err: any) {
      setApiError(err.message || "Invalid contact number or password configuration.");
    }
  };

  return (
    <div className="p-8 bg-white min-h-screen max-w-md mx-auto flex flex-col justify-center">
      <button onClick={onGoToLanding} className="mb-8 self-start p-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
        <X size={20} className="text-gray-600" />
      </button>

      <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
      <p className="text-gray-500 mb-8 text-sm">Access your civic dashboard and track complaints</p>

      {apiError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 animate-fadeIn">
          <ShieldCheck size={20} className="shrink-0 text-red-500 mt-0.5" />
          <div className="flex-grow">
            <p className="text-xs font-bold uppercase tracking-wider mb-0.5">Authentication Error</p>
            <p className="text-xs font-semibold leading-relaxed">{apiError}</p>
          </div>
          <button onClick={() => setApiError(null)} className="p-0.5 hover:bg-red-100 rounded">
            <X size={16} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Contact/Email Field */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Phone or Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
              <FileText size={18} />
            </div>
            <input
              type="text"
              placeholder="e.g. +919999999999 or user@domain.com"
              disabled={isSubmitting}
              className={`w-full pl-12 pr-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
                errors.identifier ? "border-red-300" : "border-gray-200"
              }`}
              {...register("identifier")}
            />
          </div>
          {errors.identifier && (
            <p className="text-xs text-red-500 font-medium pl-1 animate-fadeIn">{errors.identifier.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-gray-700">Password</label>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
              <ShieldCheck size={18} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Min 8 characters"
              disabled={isSubmitting}
              className={`w-full pl-12 pr-12 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
                errors.password ? "border-red-300" : "border-gray-200"
              }`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500 font-medium pl-1 animate-fadeIn">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          id="btn-login-submit"
          disabled={isSubmitting}
          className="w-full h-12 bg-emerald-500 text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:bg-gray-200 disabled:shadow-none disabled:active:scale-100 disabled:text-gray-400"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              Sign In <ArrowRight size={20} />
            </>
          )}
        </button>

        <div className="text-center pt-8">
          <p className="text-sm text-gray-500">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={onGoToRegister}
              className="text-emerald-500 font-bold hover:underline"
            >
              Register Now
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};
