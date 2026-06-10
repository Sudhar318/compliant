import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema } from "../lib/validation.ts";
import { register as apiRegister, sendOtp } from "../api/auth.ts";
import { ArrowRight, ShieldCheck, FileText, X, ChevronLeft, MapPin } from "lucide-react";
import { z } from "zod";

type RegisterFormInputs = z.infer<typeof RegisterSchema>;

interface RegisterFormProps {
  onSuccess: (phone: string, devNote?: string) => void;
  onGoToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onGoToLogin
}) => {
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      phone: "+91",
      email: "",
      password: "",
      ward: "",
      district: "Chennai"
    }
  });

  const onSubmit = async (data: RegisterFormInputs) => {
    setApiError(null);
    try {
      // 1. Register candidate user details
      await apiRegister({
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        password: data.password,
        ward: data.ward,
        district: data.district
      });

      // 2. Trigger verification OTP code dispatch
      const res = await sendOtp(data.phone);
      
      onSuccess(data.phone, res.devNote);
    } catch (err: any) {
      setApiError(err.message || "Failed to complete account registration. Verify details.");
    }
  };

  return (
    <div className="p-8 bg-white min-h-screen max-w-md mx-auto flex flex-col justify-center">
      <button onClick={onGoToLogin} className="mb-6 self-start p-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
        <ChevronLeft size={20} className="text-gray-600" />
      </button>

      <h1 className="text-2xl font-bold mb-2">Create Account</h1>
      <p className="text-gray-500 mb-6 text-sm">Register as a citizen to file complaints and track updates</p>

      {apiError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 animate-fadeIn">
          <ShieldCheck size={20} className="shrink-0 text-red-500 mt-0.5" />
          <div className="flex-grow">
            <p className="text-xs font-bold uppercase tracking-wider mb-0.5">Registration Error</p>
            <p className="text-xs font-semibold leading-relaxed">{apiError}</p>
          </div>
          <button onClick={() => setApiError(null)} className="p-0.5 hover:bg-red-100 rounded">
            <X size={16} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Full Name</label>
          <input
            type="text"
            placeholder="e.g. Arun Selvan"
            disabled={isSubmitting}
            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
              errors.name ? "border-red-300 animate-shake" : "border-gray-200"
            }`}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-red-500 font-medium pl-1 animate-fadeIn">{errors.name.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Phone Number (+91 format)</label>
          <input
            type="text"
            placeholder="e.g. +919876543210"
            disabled={isSubmitting}
            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
              errors.phone ? "border-red-300 animate-shake" : "border-gray-200"
            }`}
            {...register("phone")}
          />
          {errors.phone && (
            <p className="text-xs text-red-500 font-medium pl-1 animate-fadeIn">{errors.phone.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Email (Optional)</label>
          <input
            type="email"
            placeholder="e.g. arun@gmail.com"
            disabled={isSubmitting}
            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
              errors.email ? "border-red-300 animate-shake" : "border-gray-200"
            }`}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-500 font-medium pl-1 animate-fadeIn">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Password</label>
          <input
            type="password"
            placeholder="Min 8 characters required"
            disabled={isSubmitting}
            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
              errors.password ? "border-red-300 animate-shake" : "border-gray-200"
            }`}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-red-500 font-medium pl-1 animate-fadeIn">{errors.password.message}</p>
          )}
        </div>

        {/* Ward & District */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Ward</label>
            <input
              type="text"
              placeholder="e.g. 14"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
                errors.ward ? "border-red-300 animate-shake" : "border-gray-200"
              }`}
              {...register("ward")}
            />
            {errors.ward && (
              <p className="text-xs text-red-500 font-medium pl-1 animate-fadeIn">{errors.ward.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">District</label>
            <input
              type="text"
              placeholder="e.g. Chennai"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
                errors.district ? "border-red-300 animate-shake" : "border-gray-200"
              }`}
              {...register("district")}
            />
            {errors.district && (
              <p className="text-xs text-red-500 font-medium pl-1 animate-fadeIn">{errors.district.message}</p>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          id="btn-register-submit"
          disabled={isSubmitting}
          className="w-full h-12 bg-emerald-500 text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:bg-gray-200 disabled:shadow-none disabled:active:scale-100 disabled:text-gray-400 mt-6"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              Next: Verify OTP <ArrowRight size={20} />
            </>
          )}
        </button>

        <div className="text-center pt-4">
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onGoToLogin}
              className="text-emerald-500 font-bold hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};
