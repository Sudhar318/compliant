import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ComplaintStep2Schema } from "../lib/validation.ts";
import { ChevronLeft, MapPin, Camera, Video, Mic, X, UploadCloud, CheckCircle2 } from "lucide-react";
import { z } from "zod";

type Step2Inputs = z.infer<typeof ComplaintStep2Schema>;

interface Step2Props {
  onSuccess: (data: { address: string; latitude?: number; longitude?: number; files: File[] }) => void;
  onGoBack: () => void;
  isSubmittingAll: boolean;
}

export const FileComplaintStep2: React.FC<Step2Props> = ({
  onSuccess,
  onGoBack,
  isSubmittingAll
}) => {
  const [gpsCoords, setGpsCoords] = useState<{ latitude?: number; longitude?: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<Step2Inputs>({
    resolver: zodResolver(ComplaintStep2Schema),
    defaultValues: {
      address: "",
      latitude: undefined,
      longitude: undefined
    }
  });

  const currentAddressValue = watch("address");

  const handleGetCurrentLocation = () => {
    setGpsLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGpsCoords({ latitude, longitude });
        setValue("latitude", latitude);
        setValue("longitude", longitude);
        setGpsLoading(false);
        // Set a default address if empty
        if (!currentAddressValue) {
          setValue("address", `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
      },
      (error) => {
        setGpsError("Could not retrieve GPS coordinates automatically. Please input manually.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Drag and drop mechanics
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const filesArray = Array.from(e.dataTransfer.files);
      setAttachedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const filesArray = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setAttachedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const onSubmit = (data: Step2Inputs) => {
    onSuccess({
      address: data.address || "",
      latitude: gpsCoords?.latitude,
      longitude: gpsCoords?.longitude,
      files: attachedFiles
    });
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-4 pb-36 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onGoBack} className="p-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold">Location & Media</h1>
        <span className="text-xs font-bold text-gray-400">Step 2/2</span>
      </div>

      <div className="w-full h-1 bg-gray-100 rounded-full mb-8 overflow-hidden">
        <div className="w-full h-full bg-emerald-500"></div>
      </div>

      <h2 className="text-xl font-bold mb-2">Where did it happen?</h2>
      <p className="text-sm text-gray-500 mb-6">
        Pin the exact location and attach visual evidence to expedite resolving your grievance.
      </p>

      {/* Map visualizer mockup */}
      <div className="rounded-3xl overflow-hidden mb-6 relative">
        <img
          src="https://img.freepik.com/free-vector/map-navigation-concept_23-2148281046.jpg"
          className="w-full h-44 object-cover"
          alt="Map Selection"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white animate-pulse">
            <MapPin size={18} />
          </div>
        </div>
        {gpsCoords && (
          <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-md bg-opacity-90 animate-fadeIn">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
            GPS Active: {gpsCoords.latitude?.toFixed(4)}, {gpsCoords.longitude?.toFixed(4)}
          </div>
        )}
      </div>

      {/* Use current location button */}
      <button
        type="button"
        onClick={handleGetCurrentLocation}
        disabled={gpsLoading}
        className="w-full py-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold rounded-2xl flex items-center justify-center gap-2 border border-emerald-100 mb-6 active:scale-95 transition-all text-sm disabled:opacity-50"
      >
        <MapPin size={18} className={gpsLoading ? "animate-bounce" : ""} />
        {gpsLoading ? "Resolving precise GPS..." : "Detect Current Coordinates"}
      </button>

      {gpsError && (
        <p className="text-xs text-red-500 mb-4 pl-1 font-semibold">{gpsError}</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Address field */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Street address/Landmark</label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. 54, Cathedral Road, Anna Salai"
              className={`w-full rounded-2xl border bg-gray-50 px-4 py-3 text-base outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500 ${
                errors.address ? "border-red-300 animate-shake" : "border-gray-100"
              }`}
              {...register("address")}
            />
          </div>
          {errors.address && (
            <p className="text-xs text-red-500 font-semibold pl-1 animate-fadeIn">{errors.address.message}</p>
          )}
        </div>

        {/* Media Attachments Dropzone */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Attach Media Evidence</h3>
            <span className="text-xs font-bold text-emerald-500">{attachedFiles.length} files selected</span>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all ${
              dragActive ? "border-emerald-500 bg-emerald-50/50" : "border-gray-200 bg-slate-50 hover:bg-slate-100/50"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
              accept="image/*,video/*,audio/*"
            />
            <UploadCloud className="mx-auto text-emerald-500 mb-2 cursor-pointer hover:scale-110 transition-transform" size={32} onClick={triggerFileSelect} />
            <p className="text-xs font-bold text-gray-700 mb-1">Drag files here or</p>
            <button
              type="button"
              onClick={triggerFileSelect}
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              Browse your device
            </button>
            <p className="text-[9px] text-gray-400 font-bold uppercase mt-2">Supports images, video and voice memos</p>
          </div>
        </div>

        {/* Listed attachments of evidence */}
        {attachedFiles.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {attachedFiles.map((file, idx) => {
              const isImage = file.type.startsWith("image/");
              const isVideo = file.type.startsWith("video/");
              return (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-950 border border-gray-100">
                  {isImage ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      className="w-full h-full object-cover opacity-80"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white p-1 text-center">
                      {isVideo ? <Video size={18} /> : <Mic size={18} />}
                      <span className="text-[8px] truncate max-w-full font-bold uppercase mt-1">{file.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md active:scale-90"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3 mt-4 text-emerald-800">
          <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Aesthetic Verification</p>
            <p className="text-[10px] font-semibold leading-relaxed text-emerald-600">
              Files are processed with secure pipelines. Ensure photos show street names or clear damage signatures.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          id="btn-complaint-submit"
          disabled={isSubmittingAll}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-95 disabled:bg-gray-200 disabled:shadow-none"
        >
          {isSubmittingAll ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            "File Official Grievance"
          )}
        </button>
      </form>
    </div>
  );
};
