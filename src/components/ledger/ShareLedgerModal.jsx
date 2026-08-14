import { useState } from "react";
import { db } from "../../firebase/config";
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, deleteField } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function ShareLedgerModal({ cashbook, isOpen, onClose }) {
  const { currentUser, userProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("CAN_EDIT"); // "CAN_EDIT" | "CAN_VIEW" | "CUSTOM"
  const [canAdd, setCanAdd] = useState(true);
  const [canEdit, setCanEdit] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [sharing, setSharing] = useState(false);

  if (!isOpen || !cashbook) return null;

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === "CAN_EDIT") {
      setCanAdd(true);
      setCanEdit(true);
      setCanDelete(true);
    } else if (selectedRole === "CAN_VIEW") {
      setCanAdd(false);
      setCanEdit(false);
      setCanDelete(false);
    }
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      toast.error("Please enter a valid Gmail / Email address.");
      return;
    }

    if (cashbook.ownerEmail === targetEmail || currentUser?.email?.toLowerCase() === targetEmail) {
      toast.error("You are already the owner of this ledger.");
      return;
    }

    setSharing(true);
    try {
      // Find collaborator UID from users collection if registered
      const q = query(collection(db, "users"), where("email", "==", targetEmail));
      const userSnap = await getDocs(q);
      
      let targetUid = null;
      if (!userSnap.empty) {
        targetUid = userSnap.docs[0].id;
      }

      const emailKey = targetEmail.replace(/\./g, "_dot_");
      const cashbookRef = doc(db, "cashbooks", cashbook.id);
      const senderName = userProfile?.name || currentUser?.displayName || currentUser?.email?.split("@")[0] || "User";

      const permissionPayload = {
        email: targetEmail,
        uid: targetUid || null,
        status: "PENDING",
        role,
        permissions: {
          canAdd: role === "CAN_VIEW" ? false : canAdd,
          canEdit: role === "CAN_VIEW" ? false : canEdit,
          canDelete: role === "CAN_VIEW" ? false : canDelete,
        },
        sharedByEmail: currentUser?.email?.toLowerCase() || "",
        sharedByName: senderName,
        ledgerName: cashbook.name,
        addedAt: new Date().toISOString(),
      };

      const updateData = {
        [`sharedWith.${emailKey}`]: permissionPayload
      };

      if (targetUid) {
        updateData.sharedPendingUids = arrayUnion(targetUid);
      }

      await updateDoc(cashbookRef, updateData);

      toast.success(`Share request sent to ${targetEmail}!`);
      setEmail("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send share request. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  const handleRemoveCollaborator = async (targetEmail, targetUid) => {
    try {
      const emailKey = targetEmail.replace(/\./g, "_dot_");
      const cashbookRef = doc(db, "cashbooks", cashbook.id);

      const updateData = {
        [`sharedWith.${emailKey}`]: deleteField()
      };

      if (targetUid) {
        updateData.sharedUids = arrayRemove(targetUid);
        updateData.sharedPendingUids = arrayRemove(targetUid);
      }

      await updateDoc(cashbookRef, updateData);
      toast.success(`Removed access for ${targetEmail}`);
    } catch (err) {
      try {
        const currentMap = { ...(cashbook.sharedWith || {}) };
        const emailKey = targetEmail.replace(/\./g, "_dot_");
        delete currentMap[emailKey];
        
        const cashbookRef = doc(db, "cashbooks", cashbook.id);
        const updateData = { sharedWith: currentMap };
        if (targetUid) {
          updateData.sharedUids = arrayRemove(targetUid);
          updateData.sharedPendingUids = arrayRemove(targetUid);
        }
        await updateDoc(cashbookRef, updateData);
        toast.success(`Removed access for ${targetEmail}`);
      } catch (e2) {
        console.error(e2);
        toast.error("Failed to remove collaborator.");
      }
    }
  };

  const collaborators = cashbook.sharedWith ? Object.values(cashbook.sharedWith) : [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex justify-center items-center p-4">
      <div className="bg-bgCard border border-borderLight rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-[slideUp_0.3s_ease-out]">
        
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-h2 m-0 text-lg font-bold">🤝 Share Ledger</h3>
            <p className="text-xs text-textMuted m-0 mt-1">"{cashbook.name}"</p>
          </div>
          <button onClick={onClose} className="bg-transparent border-none text-2xl text-textMuted cursor-pointer hover:text-white leading-none">
            ×
          </button>
        </div>

        {/* ADD COLLABORATOR FORM */}
        <form onSubmit={handleAddCollaborator} className="grid gap-4 mb-6 pb-6 border-b border-borderLight">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Gmail / Email Address</label>
            <input
              type="email"
              className="w-full p-3 rounded-lg border border-borderLight bg-white/5 text-textMain text-sm focus:outline-none focus:border-brandBlue focus:bg-white/10"
              placeholder="user@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-textMuted uppercase tracking-[0.5px]">Access Permission Level</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRoleChange("CAN_EDIT")}
                className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  role === "CAN_EDIT"
                    ? "bg-brandBlue text-white border-brandBlue shadow-md"
                    : "bg-white/5 border-borderLight text-textMuted hover:text-white"
                }`}
              >
                ✏️ Can Edit
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange("CAN_VIEW")}
                className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  role === "CAN_VIEW"
                    ? "bg-brandBlue text-white border-brandBlue shadow-md"
                    : "bg-white/5 border-borderLight text-textMuted hover:text-white"
                }`}
              >
                👁️ View Only
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange("CUSTOM")}
                className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  role === "CUSTOM"
                    ? "bg-brandBlue text-white border-brandBlue shadow-md"
                    : "bg-white/5 border-borderLight text-textMuted hover:text-white"
                }`}
              >
                ⚙️ Custom
              </button>
            </div>
          </div>

          {role === "CUSTOM" && (
            <div className="flex gap-4 p-3 bg-white/5 rounded-lg border border-borderLight text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={canAdd} onChange={(e) => setCanAdd(e.target.checked)} />
                Add Entries
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={canEdit} onChange={(e) => setCanEdit(e.target.checked)} />
                Edit Entries
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={canDelete} onChange={(e) => setCanDelete(e.target.checked)} />
                Delete Entries
              </label>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={sharing}>
            {sharing ? "Sending Share Request..." : "Send Share Request"}
          </button>
        </form>

        {/* COLLABORATOR LIST */}
        <div>
          <h4 className="text-xs uppercase text-textMuted tracking-[0.5px] font-semibold mb-3">
            Shared Collaborators ({collaborators.length})
          </h4>

          {collaborators.length === 0 ? (
            <p className="text-xs text-textMuted italic m-0">Not shared with anyone yet.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
              {collaborators.map((c) => (
                <div key={c.email} className="flex justify-between items-center p-2.5 bg-white/5 border border-borderLight rounded-lg text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-textMain">{c.email}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
                        {c.status === 'ACCEPTED' ? '✅ Accepted' : '⏳ Pending'}
                      </span>
                    </div>
                    <span className="text-[11px] text-textMuted block mt-0.5">
                      Role: {c.role === "CAN_EDIT" ? "✏️ Can Edit" : c.role === "CAN_VIEW" ? "👁️ View Only" : "⚙️ Custom"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveCollaborator(c.email, c.uid)}
                    className="bg-transparent border-none text-cashOut text-xs cursor-pointer font-semibold hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
