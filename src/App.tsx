import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "./hooks/useAuth.ts";
import { createComplaint, uploadMedia, getComplaint } from "./api/complaints.ts";

// Import custom views and modular sub-components
import { LoginForm } from "./components/LoginForm.tsx";
import { RegisterForm } from "./components/RegisterForm.tsx";
import { VerificationForm } from "./components/VerificationForm.tsx";
import { FileComplaintStep1 } from "./components/FileComplaintStep1.tsx";
import { FileComplaintStep2 } from "./components/FileComplaintStep2.tsx";
import { FeedbackForm } from "./components/FeedbackForm.tsx";

import { DashboardView } from "./views/DashboardView.tsx";
import { ComplaintsListView } from "./views/ComplaintsListView.tsx";
import { ComplaintDetailView } from "./views/ComplaintDetailView.tsx";
import { AdminDashboardView } from "./views/AdminDashboardView.tsx";
import { NotificationsView } from "./views/NotificationsView.tsx";
import { ProfileView } from "./views/ProfileView.tsx";

import { Smartphone, ShieldCheck, ArrowRight, X, Plus, ClipboardList, User } from "lucide-react";
import { cn } from "./lib/utils.ts";
import { getCategoryLabel, getSubcategoryLabel } from "./lib/complaintOptions.ts";

type View =
  | "landing"
  | "login"
  | "register"
  | "verification"
  | "dashboard"
  | "file-complaint"
  | "file-step2"
  | "success"
  | "complaints"
  | "complaint-detail"
  | "notifications"
  | "feedback"
  | "profile";

export default function App() {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState<View>("landing");
  const [viewHistory, setViewHistory] = useState<View[]>([]);

  // Workflow context variables
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [selectedComplaintForFeedback, setSelectedComplaintForFeedback] = useState<any | null>(null);
  const [registrationPhone, setRegistrationPhone] = useState<string>("+91");
  const [initialDevNote, setInitialDevNote] = useState<string | null>(null);
  const [step1Fields, setStep1Fields] = useState<any>({});
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [newlyCreatedComplaint, setNewlyCreatedComplaint] = useState<any>(null);

  // Synchronous navigation history stack
  function navigate(v: View) {
    setViewHistory((prev) => [...prev, view]);
    setView(v);
  }

  function goBack() {
    setViewHistory((prev) => {
      const next = [...prev];
      const previous = next.pop() ?? "landing";
      setView(previous);
      return next;
    });
  }

  // Redirect and route-guard user status dynamically on load
  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.role === "ADMIN" || user.role === "OFFICER") {
          // Keep administrative users tied to their operational dashboards
          setView("dashboard");
        } else {
          setView("dashboard");
        }
      } else {
        setView("landing");
      }
    }
  }, [user, loading]);

  const handleStep1Success = (data: any) => {
    setStep1Fields(data);
    navigate("file-step2");
  };

  const handleStep2Success = async (data: { address: string; latitude?: number; longitude?: number; files: File[] }) => {
    setIsSubmittingAll(true);
    try {
      // 1. Submit the grievance record (API parses attributes and auto-triggers Gemini assessment queue)
      const complaint = await createComplaint({
        title: step1Fields.title,
        description: step1Fields.description,
        category: step1Fields.category,
        subcategory: step1Fields.subcategory,
        priority: step1Fields.priority,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude
      });

      if (!complaint?.id) {
        throw new Error("Complaint was created but the server did not return a complaint ID.");
      }

      // 2. Concurrently upload any attached evidence
      if (data.files && data.files.length > 0) {
        for (const file of data.files) {
          const form = new FormData();
          form.append("file", file);
          await uploadMedia(complaint.id, form);
        }
      }

      // Fetch fresh complaint matching payload details
      const freshComplaint = await getComplaint(complaint.id);
      setNewlyCreatedComplaint(freshComplaint);
      navigate("success");
    } catch (err: any) {
      alert(err.message || "Failed to submit complaint. Verify internet availability.");
    } finally {
      setIsSubmittingAll(false);
    }
  };

  const handleTriggerFeedbackModal = (complaintId: string) => {
    // Obtain information for satisfaction dialog
    getComplaint(complaintId)
      .then((data) => {
        setSelectedComplaintForFeedback({
          id: data.id,
          title: data.title,
          trackingId: data.trackingId
        });
        navigate("feedback");
      })
      .catch(() => {
        alert("Failed to load details for rating.");
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Opening Secure Channels...</p>
      </div>
    );
  }

  // --- ADMINISTRATOR ROOT ENTRY ---
  if (user && (user.role === "ADMIN" || user.role === "OFFICER")) {
    return <AdminDashboardView onLogout={logout} />;
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 font-sans text-gray-900 relative">
      <AnimatePresence mode="wait">
        {/* LANDING SCREEN */}
        {view === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen bg-white px-8 text-center max-w-md mx-auto"
          >
            <div className="w-16 h-16 bg-zinc-900 rounded-xl flex items-center justify-center mb-4 text-white hover:scale-115 transition-transform duration-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <h2 className="text-[10px] font-black tracking-widest text-gray-500 mb-10">GOVERNMENT OF TAMIL NADU</h2>

            <div className="relative mb-10">
              <img
                src="https://img.freepik.com/free-vector/system-administrator-concept-illustration_114360-1798.jpg"
                alt="Civic Illustration"
                className="w-56 h-56 object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-0 -right-4 bg-white p-2 rounded-lg shadow-md border border-gray-100">
                <Smartphone className="text-emerald-500" size={20} />
              </div>
            </div>

            <h1 className="text-2xl font-black mb-3">Your Voice, Faster Actions</h1>
            <p className="text-sm text-gray-500 mb-10 leading-relaxed font-semibold">
              AI-powered civic complaint resolution designed to bridge the gap between Tamil Nadu citizens and authorities.
            </p>

            <button
              onClick={() => navigate("login")}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
            >
              Get Started <ArrowRight size={20} />
            </button>
            <p className="mt-6 text-sm text-gray-500">
              Already have an account?{" "}
              <button onClick={() => navigate("login")} className="text-emerald-500 font-bold hover:underline">
                Sign In
              </button>
            </p>
          </motion.div>
        )}

        {/* LOGIN SCREEN */}
        {view === "login" && (
          <motion.div key="login" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <LoginForm
              onSuccess={() => setView("dashboard")}
              onGoToRegister={() => navigate("register")}
              onGoToLanding={() => setView("landing")}
            />
          </motion.div>
        )}

        {/* REGISTRATION SCREEN */}
        {view === "register" && (
          <motion.div key="register" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <RegisterForm
              onSuccess={(phone, devNote) => {
                setRegistrationPhone(phone);
                setInitialDevNote(devNote || null);
                navigate("verification");
              }}
              onGoToLogin={() => navigate("login")}
            />
          </motion.div>
        )}

        {/* OTP VERIFICATION CODE SCREEN */}
        {view === "verification" && (
          <motion.div key="verification" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <VerificationForm
              phone={registrationPhone}
              initialDevNote={initialDevNote}
              onSuccess={() => {
                alert("Phone verification completed! You can now log into your account dashboard.");
                navigate("login");
              }}
              onGoBack={goBack}
            />
          </motion.div>
        )}

        {/* CITIZEN MAIN DASHBOARD SCREEN */}
        {view === "dashboard" && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DashboardView onNavigate={(v) => navigate(v)} onLogout={logout} />
            {/* Global floating quick actions bar */}
            <TabBar active="dashboard" onNavigate={(v) => navigate(v)} />
          </motion.div>
        )}

        {/* CITIZEN REGISTER STEP 1 */}
        {view === "file-complaint" && (
          <motion.div key="file-complaint" initial={{ y: 25, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <FileComplaintStep1
              initialValues={step1Fields}
              onSuccess={handleStep1Success}
              onGoBack={() => setView("dashboard")}
            />
            <TabBar active="file" onNavigate={(v) => navigate(v)} />
          </motion.div>
        )}

        {/* CITIZEN REGISTER STEP 2 */}
        {view === "file-step2" && (
          <motion.div key="file-step2" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <FileComplaintStep2
              onSuccess={handleStep2Success}
              onGoBack={goBack}
              isSubmittingAll={isSubmittingAll}
            />
            <TabBar active="file" onNavigate={(v) => navigate(v)} />
          </motion.div>
        )}

        {/* SUCCESS FILING WORKFLOW SUMMARY */}
        {view === "success" && (
          <motion.div
            key="success"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen bg-white px-8 text-center max-w-md mx-auto"
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-25"></div>
              <ShieldCheck size={40} className="text-emerald-500" />
            </div>

            <h1 className="text-2xl font-black mb-3">Resolution Dispatch Initiated!</h1>
            <p className="text-sm text-gray-400 font-semibold mb-8">Your local grievance case has been safely authorized.</p>

            <div className="w-full space-y-6">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tamil Nadu Smart-Track ID</p>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <span className="text-xl font-mono font-black text-emerald-600">
                    {newlyCreatedComplaint?.trackingId || "TN-33423"}
                  </span>
                </div>
              </div>

              <div className="bg-emerald-50/50 rounded-3xl p-6 border border-emerald-150 text-left">
                <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-2">Automated Dispatch Report</h3>
                <p className="text-[11px] text-emerald-700 leading-relaxed font-semibold">
                  Department: <span className="font-extrabold">{getCategoryLabel(newlyCreatedComplaint?.category)}</span>. Subcategory: <span className="font-extrabold">{getSubcategoryLabel(newlyCreatedComplaint?.subcategory)}</span>. Priority tags processed via servers to schedule region {user?.district || "Chennai"}.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setStep1Fields({});
                setNewlyCreatedComplaint(null);
                setView("dashboard");
              }}
              className="mt-10 w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
            >
              Access My Workspace
            </button>
          </motion.div>
        )}

        {/* CITIZEN COMPLAINTS REGISTRY LIST */}
        {view === "complaints" && (
          <motion.div key="complaints" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ComplaintsListView
              onNavigate={(v) => navigate(v)}
              onSelectComplaint={(id) => {
                setSelectedComplaintId(id);
                navigate("complaint-detail");
              }}
            />
            <TabBar active="complaints" onNavigate={(v) => navigate(v)} />
          </motion.div>
        )}

        {/* CITIZEN COMPLAINT DETAIL STREAM */}
        {view === "complaint-detail" && (
          <motion.div key="complaint-detail" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <ComplaintDetailView
              complaintId={selectedComplaintId!}
              onGoBack={goBack}
              onNavigate={handleTriggerFeedbackModal}
            />
            <TabBar active="complaints" onNavigate={(v) => navigate(v)} />
          </motion.div>
        )}

        {/* CITIZEN IN-APP NOTIFICATIONS */}
        {view === "notifications" && (
          <motion.div key="notifications" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <NotificationsView onGoBack={goBack} />
            <TabBar active="notifications" onNavigate={(v) => navigate(v)} />
          </motion.div>
        )}

        {/* SATISFACTION SURVEY MODAL */}
        {view === "feedback" && selectedComplaintForFeedback && (
          <FeedbackForm
            complaintId={selectedComplaintForFeedback.id}
            complaintTitle={selectedComplaintForFeedback.title}
            trackingId={selectedComplaintForFeedback.trackingId}
            onSuccess={() => {
              alert("Thank you! Feedback received successfully.");
              setSelectedComplaintForFeedback(null);
              setView("complaints");
            }}
            onClose={() => {
              setSelectedComplaintForFeedback(null);
              setView("complaints");
            }}
          />
        )}

        {/* PROFILE OPTIONS VIEW */}
        {view === "profile" && (
          <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ProfileView onGoBack={() => setView("dashboard")} />
            <TabBar active="profile" onNavigate={(v) => navigate(v)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- STANDARIZED FLOATING BOTTOM NAVIGATION RAIL ---
interface TabBarProps {
  active: "dashboard" | "file" | "complaints" | "notifications" | "profile";
  onNavigate: (v: View) => void;
}

const TabBar: React.FC<TabBarProps> = ({ active, onNavigate }) => {
  const { user } = useAuth();
  if (user && (user.role === "ADMIN" || user.role === "OFFICER")) {
    return null; // Side bar navigation handles Admin flows
  }

  return (
    <div className="fixed bottom-0 left-1/2 z-50 flex min-h-[84px] w-[calc(100%-1rem)] max-w-md -translate-x-1/2 items-end justify-around rounded-t-3xl border border-b-0 border-gray-100 bg-white px-2 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
      <button
        onClick={() => onNavigate("dashboard")}
        className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 transition-colors", active === "dashboard" ? "text-emerald-500" : "text-gray-400")}
      >
        <Smartphone size={22} />
        <span className="max-w-full truncate text-[9px] font-black uppercase tracking-wider">Home</span>
      </button>
      <button
        onClick={() => onNavigate("file-complaint")}
        className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 transition-colors", active === "file" ? "text-emerald-500" : "text-gray-400")}
      >
        <div className="-mt-7 rounded-full border-4 border-white bg-emerald-500 p-2.5 text-white shadow-lg transition-transform duration-200 active:scale-95">
          <Plus size={22} />
        </div>
        <span className="mt-0.5 max-w-full truncate text-[9px] font-black uppercase tracking-wider">File Report</span>
      </button>
      <button
        onClick={() => onNavigate("complaints")}
        className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 transition-colors", active === "complaints" ? "text-emerald-500" : "text-gray-400")}
      >
        <ClipboardList size={22} />
        <span className="max-w-full truncate text-[9px] font-black uppercase tracking-wider">My Track</span>
      </button>
      <button
        onClick={() => onNavigate("profile")}
        className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 transition-colors", active === "profile" ? "text-emerald-500" : "text-gray-400")}
      >
        <User size={22} />
        <span className="max-w-full truncate text-[9px] font-black uppercase tracking-wider">Profile</span>
      </button>
    </div>
  );
};
