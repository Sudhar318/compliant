import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { verifyOtp, sendOtp } from "../api/auth.ts";
import { useAuth } from "../hooks/useAuth.ts";
import { ArrowRight, ShieldCheck, X, ChevronLeft, RefreshCw } from "lucide-react";

const VerificationSchema = z.object({
  code: z.string().length(6, "Verification code must be exactly 6 characters")
});

type VerificationInputs = z.infer<typeof VerificationSchema>;

interface VerificationFormProps {
  phone: string;
  initialDevNote?: string | null;
  onSuccess: () => void;
  onGoBack: () => void;
}

export const VerificationForm: React.FC<VerificationFormProps> = ({
  phone,
  initialDevNote,
  onSuccess,
  onGoBack
}) => {
  const { login } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(
    initialDevNote ? `OTP sent! (Dev Mode: ${initialDevNote})` : null
  );
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<VerificationInputs>({
    resolver: zodResolver(VerificationSchema),
    defaultValues: {
      code: ""
    }
  });

  const onSubmit = async (data: VerificationInputs) => {
    setApiError(null);
    setResendStatus(null);
    try {
      // 1. Verify OTP code against the database (via our controllers)
      await verifyOtp(phone, data.code);
      
      // 2. Clear out any errors and redirect.
      // Wait, in our backend the register doesn't automatically log the user in, they need to log in after verifying their phone (or we can prompt them).
      // Or we can auto-login if the backend has registered them and password was stored. But since LoginForm is clean, we can just log in or redirect to Login screen with success indicator!
      // Wait! Let's show a beautiful success state or just login.
      onSuccess();
    } catch (err: any) {
      setApiError(err.message || "Invalid verification code. Correct and retry.");
    }
  };

  const handleResend = async () => {
    setResending(true);
    setApiError(null);
    setResendStatus(null);
    try {
      const res = await sendOtp(phone);
      setResendStatus(res.devNote ? `OTP sent! (Dev Mode: ${res.devNote})` : "Verification code resent successfully!");
    } catch (err: any) {
      setApiError(err.message || "Failed to resend SMS token. Try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="p-8 bg-white min-h-screen max-w-md mx-auto flex flex-col justify-center">
      <button onClick={onGoBack} className="mb-8 self-start p-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
        <ChevronLeft size={20} className="text-gray-600" />
      </button>

      <h1 className="text-2xl font-bold mb-2">Verify Phonenumber</h1>
      <p className="text-gray-500 mb-6 text-sm">
        We sent an SMS OTP validation code to <span className="font-bold text-gray-950">{phone}</span>
      </p>

      {apiError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 animate-fadeIn">
          <ShieldCheck size={20} className="shrink-0 text-red-500 mt-0.5" />
          <div className="flex-grow">
            <p className="text-xs font-bold uppercase tracking-wider mb-0.5">Verification Failed</p>
            <p className="text-xs font-semibold leading-relaxed">{apiError}</p>
          </div>
          <button onClick={() => setApiError(null)} className="p-0.5 hover:bg-red-100 rounded">
            <X size={16} />
          </button>
        </div>
      )}

      {resendStatus && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-800 animate-fadeIn">
          <ShieldCheck size={20} className="shrink-0 text-emerald-500 mt-0.5" />
          <div className="flex-grow">
            <p className="text-xs font-bold uppercase tracking-wider mb-0.5">OTP Resent</p>
            <p className="text-xs font-semibold leading-relaxed">{resendStatus}</p>
          </div>
          <button onClick={() => setResendStatus(null)} className="p-0.5 hover:bg-emerald-100 rounded">
            <X size={16} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Verification Code */}
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed shadow-sm">
            💡 <span className="font-bold text-slate-800">Sandbox Trial Bypass:</span> You can verify instantly by typing <strong className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">123456</strong> below.
          </div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">6-Digit SMS Verification Code</label>
          <input
            type="text"
            maxLength={6}
            placeholder="e.g. 123456"
            disabled={isSubmitting}
            className={`w-full tracking-[0.5em] text-center font-mono text-2xl px-4 py-4 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
              errors.code ? "border-red-300 animate-shake" : "border-gray-200"
            }`}
            {...register("code")}
          />
          {errors.code && (
            <p className="text-xs text-red-500 text-center font-medium animate-fadeIn">{errors.code.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 bg-emerald-500 text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:bg-gray-200 disabled:shadow-none disabled:active:scale-100 disabled:text-gray-400 mt-6"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              Confirm & Verify <ArrowRight size={20} />
            </>
          )}
        </button>

        <div className="text-center pt-4">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || isSubmitting}
            className="text-xs font-bold text-emerald-500 hover:text-emerald-600 inline-flex items-center gap-1.5 active:scale-95 transition-all disabled:text-gray-300"
          >
            <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
            {resending ? "Requesting SMS Token..." : "Resend SMS Code"}
          </button>
        </div>
      </form>
    </div>
  );
};
