import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ComplaintStep1Schema } from "../lib/validation.ts";
import { ChevronLeft, ArrowRight, Sparkles } from "lucide-react";
import { z } from "zod";
import { COMPLAINT_CATEGORIES, SUBCATEGORY_OPTIONS, ComplaintCategory } from "../lib/complaintOptions.ts";

type Step1Inputs = z.infer<typeof ComplaintStep1Schema>;

interface Step1Props {
  initialValues: Partial<Step1Inputs>;
  onSuccess: (data: Step1Inputs) => void;
  onGoBack: () => void;
}

export const FileComplaintStep1: React.FC<Step1Props> = ({
  initialValues,
  onSuccess,
  onGoBack
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<Step1Inputs>({
    resolver: zodResolver(ComplaintStep1Schema),
    defaultValues: {
      title: initialValues.title || "",
      description: initialValues.description || "",
      category: initialValues.category || "ROADS",
      subcategory: initialValues.subcategory || "POTHOLE",
      priority: initialValues.priority || "MEDIUM"
    }
  });

  const selectedCategory = watch("category") as ComplaintCategory;
  const selectedSubcategory = watch("subcategory");
  const subcategoryOptions = SUBCATEGORY_OPTIONS[selectedCategory] || SUBCATEGORY_OPTIONS.ROADS;

  useEffect(() => {
    if (!subcategoryOptions.some((item) => item.value === selectedSubcategory)) {
      setValue("subcategory", subcategoryOptions[0].value);
    }
  }, [selectedCategory, selectedSubcategory, setValue, subcategoryOptions]);

  const onSubmit = (data: Step1Inputs) => {
    onSuccess(data);
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-4 pb-36 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onGoBack} className="p-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold">File Complaint</h1>
        <span className="text-xs font-bold text-gray-400">Step 1/2</span>
      </div>

      <div className="w-full h-1 bg-gray-100 rounded-full mb-8 overflow-hidden">
        <div className="w-1/2 h-full bg-emerald-500 transition-all duration-300"></div>
      </div>

      <h2 className="text-xl font-bold mb-2">Describe the Issue</h2>
      <p className="text-sm text-gray-500 mb-6">
        Provide detail about the civic problem. Gemini AI will analyze your description to map routing, department, and priority automatically upon submission.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Grievance Title</label>
          <input
            type="text"
            placeholder="e.g. Broken Water Pipeline on 3rd Street"
            className={`w-full rounded-2xl border bg-gray-50 px-4 py-3 text-base outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500 ${
              errors.title ? "border-red-300 animate-shake" : "border-gray-100"
            }`}
            {...register("title")}
          />
          {errors.title && (
            <p className="text-xs text-red-500 font-medium pl-1 animate-fadeIn">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Detailed Description</label>
          <textarea
            rows={5}
            placeholder="Large pothole on Anna Salai Road near the metro station. It is blocking the path, gathering water, and dangerous for two-wheelers."
            className={`w-full resize-none rounded-2xl border bg-gray-50 p-4 text-base outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500 ${
              errors.description ? "border-red-300 animate-shake" : "border-gray-100"
            }`}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-xs text-red-500 font-medium pl-1 animate-fadeIn">{errors.description.message}</p>
          )}
        </div>

        {/* Category Selection */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Department Select</label>
          <select
            className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-base font-semibold outline-none transition-all focus:ring-2 focus:ring-emerald-500"
            {...register("category")}
          >
            {COMPLAINT_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>{category.label}</option>
            ))}
          </select>
          {errors.category && (
            <p className="text-xs text-red-500 font-medium pl-1 animate-fadeIn">{errors.category.message}</p>
          )}
        </div>

        {/* Related Subcategory Selection */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Related Subcategory</label>
          <select
            className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-base font-semibold outline-none transition-all focus:ring-2 focus:ring-emerald-500"
            {...register("subcategory")}
          >
            {subcategoryOptions.map((subcategory) => (
              <option key={subcategory.value} value={subcategory.value}>{subcategory.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-gray-400 font-semibold pl-1">
            {COMPLAINT_CATEGORIES.find((category) => category.value === selectedCategory)?.description}
          </p>
          {errors.subcategory && (
            <p className="text-xs text-red-500 font-medium pl-1 animate-fadeIn">{errors.subcategory.message}</p>
          )}
        </div>

        {/* Priority Selection */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 font-sans">Self-declared Priority</label>
          <select
            className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-base font-semibold outline-none transition-all focus:ring-2 focus:ring-emerald-500"
            {...register("priority")}
          >
            <option value="LOW">Low - Normal Repair</option>
            <option value="MEDIUM">Medium - Expedited</option>
            <option value="HIGH">High - Urgent Hazard</option>
            <option value="CRITICAL">Critical - Extreme Danger</option>
          </select>
          {errors.priority && (
            <p className="text-xs text-red-500 font-medium pl-1 animate-fadeIn">{errors.priority.message}</p>
          )}
        </div>

        {/* AI Insight Acknowledgment Note */}
        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3 text-emerald-800">
          <Sparkles className="text-emerald-500 shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Automated Analysis Enabled</p>
            <p className="text-[10px] font-semibold leading-relaxed text-emerald-600">
              Our Gemini server processing matches keyword indices against historic departmental databases to schedule dispatch and assign zones.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-4 font-semibold text-white shadow-lg shadow-emerald-500/20 transition-transform hover:bg-emerald-600 active:scale-95"
          >
            Next: Location & Media <ArrowRight size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};
