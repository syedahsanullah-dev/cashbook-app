import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Profile() {
  const navigate = useNavigate();
  const { currentUser, userProfile, updateUserProfile, updateUserEmail, updateUserPassword } = useAuth();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || "");
      setUsername(userProfile.username || "");
      setPhone(userProfile.phone || "");
      setPhotoURL(userProfile.photoURL || "");
      setNewEmail(userProfile.email || currentUser?.email || "");
    } else if (currentUser) {
      setName(currentUser.displayName || "");
      setUsername(currentUser.email?.split("@")[0] || "");
      setNewEmail(currentUser.email || "");
      setPhotoURL(currentUser.photoURL || "");
    }
  }, [userProfile, currentUser]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 300;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        setPhotoURL(compressedBase64);
      };
    };
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Full Name is required.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateUserProfile({
        name: name.trim(),
        username: username.trim(),
        phone: phone.trim(),
        photoURL,
      });
      toast.success("Profile details updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile details.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === currentUser?.email) {
      toast.error("Please enter a new valid email address.");
      return;
    }

    setSavingEmail(true);
    try {
      await updateUserEmail(newEmail.trim(), currentPassword);
      toast.success("Email address updated!");
      setCurrentPassword("");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/requires-recent-login" || err.code === "auth/wrong-password") {
        toast.error("Invalid current password or session expired. Please re-authenticate.");
      } else {
        toast.error("Failed to update email: " + (err.message || err.code));
      }
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await updateUserPassword(newPassword, currentPassword);
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        toast.error("Incorrect current password.");
      } else {
        toast.error("Failed to update password: " + (err.message || err.code));
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const firstLetter = name?.charAt(0).toUpperCase() || currentUser?.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="pb-12 min-h-screen">
      {/* HEADER */}
      <header className="flex items-center gap-3 p-5 bg-bgMain/80 backdrop-blur-md border-b border-borderLight sticky top-0 z-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-transparent border-none text-textMuted cursor-pointer text-base font-semibold transition-colors hover:text-brandBlue"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-h1 m-0 text-xl font-bold ml-auto">
          User Profile
        </h1>
      </header>

      <main className="p-5 max-w-2xl mx-auto grid gap-6">

        {/* AVATAR & USER SUMMARY CARD */}
        <div className="card text-center p-6 flex flex-col items-center justify-center">
          <div className="relative mb-4 group">
            {photoURL ? (
              <img
                src={photoURL}
                alt="Profile Avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-brandBlue shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-brandBlue/30 border-2 border-brandBlue flex items-center justify-center text-4xl font-bold text-brandBlue shadow-lg">
                {firstLetter}
              </div>
            )}

            <label className="absolute bottom-0 right-0 bg-brandBlue text-white p-2 rounded-full cursor-pointer shadow-md transition-transform hover:scale-110" title="Upload Photo">
              📷
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          <h2 className="text-xl font-bold m-0">{name || "User"}</h2>
          <p className="text-textMuted text-xs m-0 mt-1">@{username || "username"}</p>
          <span className="mt-2 text-xs bg-white/10 px-3 py-1 rounded-full text-textMain">
            ✉️ {currentUser?.email}
          </span>
        </div>

        {/* PERSONAL DETAILS FORM */}
        <div className="card">
          <h3 className="text-h2 mb-4 text-base font-bold flex items-center gap-2">
            👤 Personal Details
          </h3>

          <form onSubmit={handleSaveProfile} className="grid gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Full Name</label>
              <input
                type="text"
                className="w-full p-3 rounded-lg border border-borderLight bg-white/5 text-textMain text-sm focus:outline-none focus:border-brandBlue focus:bg-white/10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g. Ahsan Gillani"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Username</label>
              <input
                type="text"
                className="w-full p-3 rounded-lg border border-borderLight bg-white/5 text-textMain text-sm focus:outline-none focus:border-brandBlue focus:bg-white/10"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="E.g. ahsangillani"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Phone Number</label>
              <input
                type="tel"
                className="w-full p-3 rounded-lg border border-borderLight bg-white/5 text-textMain text-sm focus:outline-none focus:border-brandBlue focus:bg-white/10"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="E.g. +92 300 1234567"
              />
            </div>

            <button
              type="submit"
              className="btn-primary mt-2"
              disabled={savingProfile}
            >
              {savingProfile ? "Saving Profile..." : "Save Profile Details"}
            </button>
          </form>
        </div>

        {/* CHANGE EMAIL SECTION */}
        <div className="card">
          <h3 className="text-h2 mb-4 text-base font-bold flex items-center gap-2">
            ✉️ Change Email Address
          </h3>

          <form onSubmit={handleSaveEmail} className="grid gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">New Email</label>
              <input
                type="email"
                className="w-full p-3 rounded-lg border border-borderLight bg-white/5 text-textMain text-sm focus:outline-none focus:border-brandBlue focus:bg-white/10"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Current Password (Required for Auth)</label>
              <input
                type="password"
                className="w-full p-3 rounded-lg border border-borderLight bg-white/5 text-textMain text-sm focus:outline-none focus:border-brandBlue focus:bg-white/10"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Confirm with password"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={savingEmail}
            >
              {savingEmail ? "Updating Email..." : "Update Email"}
            </button>
          </form>
        </div>

        {/* CHANGE PASSWORD SECTION */}
        <div className="card">
          <h3 className="text-h2 mb-4 text-base font-bold flex items-center gap-2">
            🔒 Change Password
          </h3>

          <form onSubmit={handleSavePassword} className="grid gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">New Password</label>
              <input
                type="password"
                className="w-full p-3 rounded-lg border border-borderLight bg-white/5 text-textMain text-sm focus:outline-none focus:border-brandBlue focus:bg-white/10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Confirm New Password</label>
              <input
                type="password"
                className="w-full p-3 rounded-lg border border-borderLight bg-white/5 text-textMain text-sm focus:outline-none focus:border-brandBlue focus:bg-white/10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Current Password (Required for Auth)</label>
              <input
                type="password"
                className="w-full p-3 rounded-lg border border-borderLight bg-white/5 text-textMain text-sm focus:outline-none focus:border-brandBlue focus:bg-white/10"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={savingPassword}
            >
              {savingPassword ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        </div>

      </main>
    </div>
  );
}
