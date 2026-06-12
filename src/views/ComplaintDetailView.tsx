import React, { useEffect, useState } from "react";
import { getComplaint, escalate, ComplaintDetail } from "../api/complaints.ts";
import { ChevronLeft, Clock, CheckCircle2, ShieldCheck, MapPin, Sparkles, MessageSquare, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils.ts";
import { getCategoryLabel, getStatusLabel, getSubcategoryLabel } from "../lib/complaintOptions.ts";

interface ComplaintDetailViewProps {
  complaintId: string;
  onGoBack: () => void;
  onNavigate: (v: any) => void;
}

export const ComplaintDetailView: React.FC<ComplaintDetailViewProps> = ({
  complaintId,
  onGoBack,
  onNavigate
}) => {
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDetail = async () => {
    try {
      const data = await getComplaint(complaintId);
      setComplaint(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load detailed grievance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();

    // Start polling if AI Analysis is missing
    const interval = setInterval(async () => {
      try {
        const data = await getComplaint(complaintId);
        setComplaint(data);
        if (data.aiSummary) {
          clearInterval(interval);
        }
      } catch (e) {
        // Suppress transient query exceptions during polling
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [complaintId]);

  const handleEscalateDispute = async () => {
    if (!complaint) return;
    setEscalating(true);
    setErrorMsg(null);
    try {
      await escalate(complaint.id);
      await fetchDetail();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to escalate dispute. Try verifying credentials.");
    } finally {
      setEscalating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-md mx-auto text-center bg-slate-50 min-h-screen flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Accessing Secure Records...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="p-8 max-w-md mx-auto text-center bg-slate-50 min-h-screen">
        <p className="text-sm text-red-500 font-bold mb-4">{errorMsg || "Record not found"}</p>
        <button onClick={onGoBack} className="text-xs font-bold text-emerald-500 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const isResolved = ["RESOLVED", "CLOSED"].includes(complaint.status);

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-32">
      {/* Sticky top detailing header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onGoBack} className="p-1 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-base font-black text-gray-900">Case ID: {complaint.trackingId}</h1>
        </div>
        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md font-bold uppercase tracking-wider">
          {getStatusLabel(complaint.status)}
        </span>
      </div>

      <div className="p-4">
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-2xl flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="font-extrabold text-sm ml-2">×</button>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-1 rounded-md uppercase">
            {getCategoryLabel(complaint.category)}
          </span>
          <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded-md uppercase">
            {getSubcategoryLabel(complaint.subcategory)}
          </span>
          <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-1 rounded-md uppercase">
            Priority: {complaint.priority}
          </span>
        </div>

        <h1 className="text-xl font-black mb-2 text-gray-950 leading-snug">{complaint.title}</h1>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed font-semibold">{complaint.description}</p>

        {/* AI summary poll box status */}
        <div className="bg-slate-900 text-white rounded-[32px] p-6 mb-8 shadow-xl border border-slate-800">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-800">
            <Sparkles className="text-emerald-400 shrink-0" size={20} />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">SmartTrack Civic Guard</h3>
              <h4 className="text-sm font-black text-white">Judicial Routing & Guidance Engine</h4>
            </div>
          </div>

          {!complaint.aiSummary ? (
            <div className="space-y-3 animate-pulse py-2">
              <div className="h-2.5 bg-slate-800 rounded w-3/4"></div>
              <div className="h-2.5 bg-slate-800 rounded w-5/6"></div>
              <div className="h-2.5 bg-slate-800 rounded w-1/2"></div>
              <p className="text-[10px] text-emerald-400 font-extrabold italic uppercase mt-3">
                🤖 Executing Tamil Nadu Statutory Grounding Engine... Polling...
              </p>
            </div>
          ) : (() => {
            let guidance: any = null;
            try {
              guidance = JSON.parse(complaint.aiSummary);
            } catch (e) {
              // Plaintext fallback
            }

            if (guidance && typeof guidance === "object" && guidance.toWhom) {
              return (
                <div className="space-y-5 text-left">
                  {/* Category & Urgency */}
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-500/30">
                      {guidance.category}
                    </span>
                    <span className="bg-rose-500/20 text-rose-300 text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border border-rose-500/30">
                      Urgency: {guidance.priority}
                    </span>
                  </div>

                  {/* TO WHOM */}
                  <div className="space-y-1 bg-slate-850/50 p-3 rounded-2xl border border-slate-800">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">I. TO WHOM (Administrative Jurisdiction)</p>
                    <p className="text-xs font-bold text-slate-100">{guidance.toWhom?.agencyName || "Tamil Nadu Public Board"}</p>
                    <p className="text-[10px] text-emerald-400 font-medium">Division: {guidance.toWhom?.zonalAuthority || "N/A"}</p>
                  </div>

                  {/* WHERE & HOW */}
                  <div className="space-y-1.5 bg-slate-850/50 p-3 rounded-2xl border border-slate-800">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">II. WHERE & HOW (Filing Strategy & Site Directive)</p>
                    <p className="text-xs text-slate-300 leading-relaxed font-semibold">{guidance.howAndWhere?.filingUrgencyText}</p>
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border-l-2 border-emerald-500 mt-1">
                      <p className="text-[8px] text-emerald-400 font-black uppercase tracking-widest">Inspector Ward Guidance</p>
                      <p className="text-[11px] text-slate-200 font-bold">{guidance.howAndWhere?.siteActionDirective}</p>
                    </div>
                  </div>

                  {/* ON WHAT BASIS */}
                  <div className="space-y-1.5 bg-slate-850/50 p-3 rounded-2xl border border-slate-800">
                    <p className="text-[9px] text-amber-400 font-black uppercase tracking-wider">III. ON WHAT BASIS (Statutory Grounding)</p>
                    <div className="flex gap-1.5 items-center">
                      <ShieldCheck size={14} className="text-amber-400 shrink-0" />
                      <p className="text-xs font-black text-amber-300">{guidance.onWhatBasis?.statuteName}</p>
                    </div>
                    <p className="text-[10px] text-slate-300 font-semibold bg-slate-950 px-2 py-0.5 rounded-md inline-block">
                      Provision: {guidance.onWhatBasis?.legalProvision}
                    </p>
                    <p className="text-[11px] text-slate-300 leading-normal italic font-medium">
                      "{guidance.onWhatBasis?.rightsExplanation}"
                    </p>
                  </div>

                  {/* TECHNICAL SUMMARY LOG */}
                  <div className="text-[10px] text-slate-500 font-mono bg-slate-950 p-2 rounded-xl text-center border border-slate-900">
                    LOG // {guidance.aiTechnicalSummary}
                  </div>
                </div>
              );
            }

            // Standard fallback if aiSummary is raw prose
            return (
              <div>
                <p className="text-xs text-slate-300 leading-relaxed font-semibold mb-4">
                  {complaint.aiSummary}
                </p>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-sm text-left">
                    <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Route Dept</p>
                    <p className="text-xs font-black text-white">{getCategoryLabel(complaint.category)}</p>
                  </div>
                  <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-sm text-left">
                    <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Est. SLA</p>
                    <p className="text-xs font-black text-white">48 Hours</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Location Detailing */}
        <div className="space-y-3 mb-8">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Target Coordinates</h3>
          <div className="rounded-3xl border border-gray-100 overflow-hidden shadow-sm bg-white">
            <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-gray-100 flex items-center justify-center text-emerald-500">
                <MapPin size={22} />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-black text-gray-900 truncate">Confirmed Address</h4>
                <p className="text-[10px] text-gray-500 font-bold truncate">{complaint.address || "GPS-bound reports only"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Evidence Media attachments */}
        {complaint.media && complaint.media.length > 0 && (
          <div className="space-y-3 mb-8">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Exhibited Evidence ({complaint.media.length})</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {complaint.media.map((med: any) => (
                <div key={med.id} className="min-w-[120px] aspect-[4/3] rounded-2xl overflow-hidden relative shadow-sm border border-gray-100 bg-black">
                  <img
                    src={med.url}
                    className="w-full h-full object-cover opacity-90"
                    alt="Evidence Item"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-1.5 left-2 bg-black/50 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                    {med.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Officer card details */}
        {complaint.assignedOfficer && (
          <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-8 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Assigned Dispatch Officer</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-extrabold uppercase text-sm">
                {complaint.assignedOfficer.name.substring(0, 2)}
              </div>
              <div>
                <p className="text-sm font-black text-gray-900">{complaint.assignedOfficer.name}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase">{complaint.assignedOfficer.phone}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dispute Actions */}
        <div className="space-y-3">
          {isResolved ? (
            <button
              onClick={() => onNavigate("feedback")}
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-md shadow-emerald-500/20 active:scale-95 transition-transform text-sm"
            >
              Rate & Close Complaint
            </button>
          ) : (
            <>
              {complaint.assignedOfficer && (
                <a
                  href={`tel:${complaint.assignedOfficer.phone}`}
                  className="w-full py-4 bg-emerald-550 border border-emerald-500 bg-opacity-10 text-emerald-700 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-transform text-xs"
                >
                  <MessageSquare size={16} /> Contact Assigned Department
                </a>
              )}
              {complaint.status !== "ESCALATED" && (
                <button
                  type="button"
                  id="btn-complaint-escalate"
                  onClick={handleEscalateDispute}
                  disabled={escalating}
                  className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-black flex items-center justify-center gap-1.5 border border-red-100 active:scale-95 transition-transform text-xs disabled:opacity-45"
                >
                  <AlertTriangle size={16} />
                  {escalating ? "Escalating..." : "Request Dispute Escalation"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
