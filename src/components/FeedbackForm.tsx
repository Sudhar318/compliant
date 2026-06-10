import React, { useState } from "react";
import { submitFeedback } from "../api/complaints.ts";
import { X, CheckCircle2, Flame, Mic } from "lucide-react";
import { cn } from "../lib/utils.ts";

interface FeedbackFormProps {
  complaintId: string;
  complaintTitle: string;
  trackingId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  complaintId,
  complaintTitle,
  trackingId,
  onSuccess,
  onClose
}) => {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const availableTags = ["Fast Response", "Quality Fix", "Polite Staff", "Clear Info", "Easy Tracking"];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitFeedback = async () => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      await submitFeedback(complaintId, {
        rating,
        tags: selectedTags.join(", "),
        comment: comment || undefined
      });
      onSuccess();
    } catch (err: any) {
      setApiError(err.message || "Could not register satisfaction survey. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center p-0 md:p-6 z-50 animate-fadeIn overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-t-[40px] md:rounded-[40px] p-8 pb-12 shadow-2xl relative mt-20 animate-slideUp">
        <div className="w-12 h-1.5 bg-gray-250 rounded-full mx-auto mb-8 md:hidden"></div>
        <button
          onClick={onClose}
          className="absolute top-8 right-8 w-10 h-10 bg-gray-50 hover:bg-gray-100 transition-colors rounded-full flex items-center justify-center text-gray-400"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-black mb-2 text-gray-900">Rate Resolution Outcome</h2>
          <p className="text-sm text-gray-500 font-medium">How satisfied are you with the service team?</p>
        </div>

        {apiError && (
          <p className="text-xs text-red-500 font-bold mb-4 bg-red-50 p-3 rounded-2xl text-center">
            {apiError}
          </p>
        )}

        <div className="bg-emerald-50/50 border border-emerald-100 rounded-[32px] p-5 mb-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-emerald-500">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">
              Case {trackingId}
            </p>
            <p className="text-sm font-black text-gray-900">{complaintTitle}</p>
          </div>
        </div>

        {/* Rating indicators */}
        <div className="flex justify-center gap-4 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={cn("transition-colors hover:scale-110", star <= rating ? "text-orange-500" : "text-gray-200")}
            >
              <Flame size={40} className="fill-current" />
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Unsatisfying</div>
          <div className="text-xs font-black text-gray-400 uppercase tracking-widest px-2 text-right">Excellent!</div>
        </div>

        {/* What went well Tags selection */}
        <div className="mb-8">
          <p className="text-xs font-black text-gray-900 uppercase tracking-widest px-2 mb-4">What went well?</p>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "px-4 py-2 text-xs font-black rounded-full border transition-all duration-200 active:scale-95",
                    active
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                      : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Text Area comments */}
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-end px-2">
            <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Additional Comments</p>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isSubmitting}
            className="w-full bg-gray-50 border border-gray-100 rounded-3xl p-5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all h-28 resize-none"
            placeholder="Tell us more about your experience (optional)..."
          ></textarea>
        </div>

        <button
          onClick={handleSubmitFeedback}
          disabled={isSubmitting}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-3xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all text-sm disabled:bg-gray-200"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          ) : (
            "Complete Survey & Submit"
          )}
        </button>
      </div>
    </div>
  );
};
