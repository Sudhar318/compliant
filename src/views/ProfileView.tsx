import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth.ts";
import { updateProfile } from "../api/auth.ts";
import { motion } from "motion/react";
import { 
  User, Mail, Phone, MapPin, Building, ShieldCheck, 
  KeyRound, ArrowLeft, CheckCircle, AlertTriangle, RefreshCw, Save
} from "lucide-react";

interface ProfileViewProps {
  onGoBack: () => void;
}

const DISTRICT_OPTIONS = [
  "Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", "Tirunelveli", 
  "Thanjavur", "Vellore", "Kancheepuram", "Tiruvallur", "Erode", "Tiruppur", 
  "Tuticorin", "Dharmapuri", "Krishnagiri", "Cuddalore", "Villupuram", "Thanjavur"
];

export const ProfileView: React.FC<ProfileViewProps> = ({ onGoBack }) => {
  const { user, setUser } = useAuth();
  
  // Local form states initialized with active user attributes
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [ward, setWard] = useState(user?.ward || "");
  const [district, setDistrict] = useState(user?.district || "");
  const [aadhaarVerified, setAadhaarVerified] = useState(!!user?.aadhaarVerified);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Status & Feedback states
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Derive simple Initials for elegant Avatar Header
  const getInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase() || "TN";
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    // Validate name is not blank
    if (!name.trim()) {
      setErrorMsg("Full Name cannot be empty.");
      return;
    }

    // Validate password confirmation match if password is being set
    if (password && password !== confirmPassword) {
      setErrorMsg("Confirmation password does not match original value.");
      return;
    }

    setUpdating(true);

    try {
      const response = await updateProfile({
        name,
        email: email.trim() || null,
        phone,
        ward: ward.trim() || null,
        district: district || null,
        aadhaarVerified,
        password: password || undefined,
      });

      if (response && response.user) {
        // Update user state globally in active AuthProvider context to trigger immediate rerenders
        setUser({
          id: response.user.id,
          name: response.user.name,
          phone: response.user.phone,
          email: response.user.email,
          role: response.user.role,
          ward: response.user.ward,
          district: response.user.district,
          aadhaarVerified: response.user.aadhaarVerified,
        });

        // Blank secure inputs
        setPassword("");
        setConfirmPassword("");

        setSuccessMsg(response.message || "Profile updated securely!");
        // Auto-fade success banner after 4 seconds
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      console.error("Profile saving failure:", err);
      setErrorMsg(err.message || "Could not update profile information. Check details.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="pb-24 max-w-md mx-auto bg-slate-50 min-h-screen">
      {/* Absolute Stickied Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 p-4 py-4 flex items-center gap-3 z-40 shadow-sm">
        <button 
          onClick={onGoBack} 
          className="text-gray-600 p-1.5 hover:bg-slate-100 active:scale-90 rounded-full transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-black text-slate-800">My Account Hub</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Avatar Card */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 opacity-50"></div>
          
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white text-2xl font-black mb-3 shadow-md shadow-emerald-500/10 relative">
            {getInitials(name)}
            
            {aadhaarVerified && (
              <span className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-100 border-2 border-white rounded-full flex items-center justify-center text-emerald-600" title="Aadhaar Verified Account">
                <ShieldCheck size={14} />
              </span>
            )}
          </div>

          <h2 className="text-xl font-black text-slate-800 leading-tight">{name || "Citizen"}</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Tamil Nadu {user?.role || "Citizen"}</p>

          <div className="flex gap-2 mt-4">
            <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
              📍 {district || "District Not Set"}
            </span>
            <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
              🏢 Ward {ward || "Not Set"}
            </span>
          </div>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="bg-emerald-50 border border-emerald-150 p-4 rounded-2xl flex items-start gap-3"
          >
            <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18} />
            <p className="text-xs font-semibold text-emerald-800 leading-relaxed">{successMsg}</p>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3"
          >
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <p className="text-xs font-semibold text-red-800 leading-relaxed">{errorMsg}</p>
          </motion.div>
        )}

        {/* Editable Fields Form */}
        <form onSubmit={handleSaveChanges} className="space-y-5">
          {/* Section: Basic Details */}
          <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Grievance Identity Details</h3>

            {/* Field: Full Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your complete legal name"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-transparent focus:border-slate-100 rounded-2xl text-xs font-semibold transition-all focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Field: Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@tamilnadu.gov.in"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-transparent focus:border-slate-100 rounded-2xl text-xs font-semibold transition-all focus:outline-none"
                />
              </div>
            </div>

            {/* Field: Mobile Number */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mobile Number</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Phone size={16} />
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-transparent focus:border-slate-100 rounded-2xl text-xs font-semibold transition-all focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section: Local Area Jurisdiction */}
          <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Local Jurisdictional Area</h3>

            {/* Field: District Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">District</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <MapPin size={16} />
                </span>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-transparent focus:border-slate-100 rounded-2xl text-xs font-semibold appearance-none transition-all focus:outline-none"
                >
                  <option value="">Select District</option>
                  {DISTRICT_OPTIONS.map((dist) => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Field: Ward */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Corporation Ward</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Building size={16} />
                </span>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="e.g. Ward 17"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-transparent focus:border-slate-100 rounded-2xl text-xs font-semibold transition-all focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Verification Badging */}
          <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Verification & Security</h3>

            {/* Field: Aadhaar Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${aadhaarVerified ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Aadhaar Identity Hook</h4>
                  <p className="text-[10px] text-slate-400 font-semibold">{aadhaarVerified ? 'Aadhaar fully synchronized' : 'Aadhaar connection pending'}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={aadhaarVerified} 
                  onChange={(e) => setAadhaarVerified(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>

          {/* Section: Reset Password */}
          <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Reset Password Security</h3>

            {/* Field: New Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">New Security Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <KeyRound size={16} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-transparent focus:border-slate-100 rounded-2xl text-xs font-semibold transition-all focus:outline-none"
                  minLength={6}
                />
              </div>
            </div>

            {/* Field: Confirm Password */}
            {password && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Retype New Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <KeyRound size={16} />
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-transparent focus:border-slate-100 rounded-2xl text-xs font-semibold transition-all focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Save Profile Button */}
          <button
            type="submit"
            disabled={updating}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-xs uppercase tracking-wider"
          >
            {updating ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Synchronizing Profile...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes Securely
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
