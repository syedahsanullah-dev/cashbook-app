import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import CreateLedgerModal from "../components/ledger/CreateLedgerModal";
import ShareLedgerModal from "../components/ledger/ShareLedgerModal";
import LoadingScreen from "../components/LoadingScreen";
import toast from "react-hot-toast";

function PendingInviteCard({ book, currentUser, onAccept, onDecline }) {
  const emailKey = currentUser?.email?.toLowerCase().replace(/\./g, "_dot_");
  const invite = book.sharedWith ? book.sharedWith[emailKey] : null;

  if (!invite) return null;

  const senderName = invite.sharedByName || "A User";
  const senderEmail = invite.sharedByEmail || "owner";
  const role = invite.role;
  const perms = invite.permissions || {};

  let roleBadge = "✏️ Can Edit";
  if (role === "CAN_VIEW") roleBadge = "👁️ View Only";
  if (role === "CUSTOM") roleBadge = "⚙️ Custom Permissions";

  return (
    <div className="card border border-amber-500/40 bg-amber-500/5 p-4 rounded-xl flex flex-col justify-between h-full shadow-lg">
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
            📩 Pending Share Request
          </span>
          <span className="text-[10px] text-textMuted">
            {invite.addedAt ? new Date(invite.addedAt).toLocaleDateString() : "Recent"}
          </span>
        </div>

        <h3 className="text-base font-bold text-textMain m-0 mb-1">{book.name}</h3>
        <p className="text-xs text-textMuted m-0 mb-3">
          Shared by <strong className="text-textMain">{senderName}</strong> ({senderEmail})
        </p>

        <div className="bg-white/5 p-3 rounded-lg border border-borderLight mb-4 text-xs">
          <div className="font-semibold text-brandBlue mb-1">Granted Role: {roleBadge}</div>
          <div className="flex flex-wrap gap-2 text-[11px] text-textMuted mt-1">
            <span className={perms.canAdd ? "text-green font-semibold" : "text-cashOut font-semibold"}>
              {perms.canAdd ? "✓ Add Entries" : "✗ Cannot Add"}
            </span>
            <span className={perms.canEdit ? "text-green font-semibold" : "text-cashOut font-semibold"}>
              {perms.canEdit ? "✓ Edit Entries" : "✗ Cannot Edit"}
            </span>
            <span className={perms.canDelete ? "text-green font-semibold" : "text-cashOut font-semibold"}>
              {perms.canDelete ? "✓ Delete Entries" : "✗ Cannot Delete"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onAccept(book)}
          className="py-2.5 px-3 rounded-lg bg-green text-white font-semibold cursor-pointer text-xs flex-1 transition-all hover:bg-green/80 shadow-md"
        >
          ✅ Accept Request
        </button>
        <button
          onClick={() => onDecline(book)}
          className="px-3 py-2 rounded-lg border border-borderLight bg-white/5 text-cashOut text-xs font-semibold cursor-pointer hover:bg-cashOutBg"
        >
          Decline
        </button>
      </div>
    </div>
  );
}

function LedgerCard({ book, currentUser, onTogglePin, onOpenLedger, onShareLedger }) {
  const [dues, setDues] = useState([]);
  
  useEffect(() => {
    const q = query(collection(db, "cashbooks", book.id, "dues"));
    const unsub = onSnapshot(q, (snapshot) => {
      setDues(snapshot.docs.map(d => d.data()));
    });
    return unsub;
  }, [book.id]);

  const isOwner = book.userId === currentUser?.uid;
  
  let roleLabel = "👑 Owner";
  let badgeColor = "bg-brandBlue/20 text-brandBlue border-brandBlue/40";

  if (!isOwner) {
    const userEmailKey = currentUser?.email?.toLowerCase().replace(/\./g, "_dot_");
    const collaboratorInfo = book.sharedWith ? book.sharedWith[userEmailKey] : null;
    const role = collaboratorInfo?.role;

    if (role === "CAN_VIEW") {
      roleLabel = "👁️ Shared (Viewer)";
      badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
    } else {
      roleLabel = "👥 Shared (Editor)";
      badgeColor = "bg-green-500/20 text-green-300 border-green-500/40";
    }
  }

  const balanceInDisplay = (book.balance / 100).toFixed(2);
  const isPositive = book.balance >= 0;

  const totalReceivable = dues.filter(d => d.type === "CREDIT").reduce((sum, d) => sum + d.amount, 0);
  const totalPayable = dues.filter(d => d.type === "DEBIT").reduce((sum, d) => sum + d.amount, 0);
  const pendingDuesPaisa = totalReceivable - totalPayable;
  const pendingDuesDisplay = (pendingDuesPaisa / 100).toFixed(2);
  const isPendingPositive = pendingDuesPaisa >= 0;

  return (
    <div className="card flex flex-col justify-between h-full border border-borderLight hover:border-brandBlue/50 transition-all shadow-md">
      <div>
        <div className="flex justify-between items-start mb-2">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${badgeColor}`}>
            {roleLabel}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); onTogglePin(book); }}
            className={`bg-transparent border-none cursor-pointer text-xl transition-colors duration-200 ${book.isPinned ? "text-brandBlue" : "text-textMuted"}`}
            title={book.isPinned ? "Unpin Ledger" : "Pin Ledger"}
          >
            {book.isPinned ? "★" : "☆"}
          </button>
        </div>

        <h3 className="text-h2 mb-1 text-lg font-bold text-textMain">
          {book.name}
        </h3>
        
        <p className="text-textMuted mb-4 text-xs">
          Created: {book.createdAt?.toDate ? book.createdAt.toDate().toLocaleDateString() : "Recently"}
        </p>

        <div className="mb-3 p-3 bg-white/5 rounded-lg border border-borderLight">
          <span className="text-textMuted text-[11px] uppercase tracking-[0.5px] font-semibold block">
            Cash Balance
          </span>
          <h2 className={`text-balance mt-0.5 text-xl font-bold ${isPositive ? "text-green" : "text-red"}`}>
            {book.currency} {balanceInDisplay}
          </h2>
        </div>

        <div className="mb-4 p-3 bg-white/5 rounded-lg border border-borderLight">
          <span className="text-textMuted text-[11px] uppercase tracking-[0.5px] font-semibold block">
            Pending Dues
          </span>
          <h2 className={`text-balance mt-0.5 text-base font-bold ${isPendingPositive ? "text-green" : "text-red"}`}>
            {book.currency} {pendingDuesDisplay}
          </h2>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <button onClick={() => onOpenLedger(book.id)} className="btn-primary flex-1 text-sm py-2.5">
          Open Ledger ➔
        </button>

        {isOwner && (
          <button 
            onClick={() => onShareLedger(book)} 
            className="px-3 py-2.5 rounded-lg border border-brandBlue/40 bg-brandBlue/10 text-brandBlue cursor-pointer text-xs font-semibold hover:bg-brandBlue/20"
            title="Share Ledger"
          >
            🤝 Share
          </button>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const pendingScrollRef = useRef(null);
  const ownedScrollRef = useRef(null);
  const sharedScrollRef = useRef(null);

  const [cashbooks, setCashbooks] = useState([]);
  const [pendingBooks, setPendingBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [error, setError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sharingBook, setSharingBook] = useState(null);

  const scrollContainer = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleWheelScroll = (e, ref) => {
    if (ref.current && Math.abs(e.deltaY) > 0) {
      ref.current.scrollLeft += e.deltaY;
    }
  };

  // REAL-TIME LISTENER FOR OWNED, SHARED & PENDING INVITATIONS
  useEffect(() => {
    if (!currentUser) return;

    let ownedBooks = [];
    let sharedBooks = [];

    const updateBooksState = () => {
      const combinedMap = new Map();
      ownedBooks.forEach(b => combinedMap.set(b.id, b));
      sharedBooks.forEach(b => combinedMap.set(b.id, b));
      setCashbooks(Array.from(combinedMap.values()));
      setLoadingBooks(false);
    };

    // 1. Owned ledgers listener
    const qOwned = query(collection(db, "cashbooks"), where("userId", "==", currentUser.uid));
    const unsubOwned = onSnapshot(
      qOwned,
      (snapshot) => {
        ownedBooks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        updateBooksState();
      },
      (err) => {
        console.error("Error fetching owned cashbooks:", err);
        setLoadingBooks(false);
      }
    );

    // 2. Shared ledgers listener (Accepted)
    const qShared = query(collection(db, "cashbooks"), where("sharedUids", "array-contains", currentUser.uid));
    const unsubShared = onSnapshot(
      qShared,
      (snapshot) => {
        sharedBooks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        updateBooksState();
      },
      (err) => {
        console.warn("Shared cashbooks notice:", err);
        updateBooksState();
      }
    );

    // 3. Pending invitations listener
    const qPending = query(collection(db, "cashbooks"), where("sharedPendingUids", "array-contains", currentUser.uid));
    const unsubPending = onSnapshot(
      qPending,
      (snapshot) => {
        setPendingBooks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.warn("Pending invitations notice:", err);
      }
    );

    return () => {
      unsubOwned();
      unsubShared();
      unsubPending();
    };
  }, [currentUser]);

  const handleAcceptInvite = async (book) => {
    try {
      const emailKey = currentUser?.email?.toLowerCase().replace(/\./g, "_dot_");
      const cashbookRef = doc(db, "cashbooks", book.id);

      await updateDoc(cashbookRef, {
        [`sharedWith.${emailKey}.status`]: "ACCEPTED",
        sharedPendingUids: arrayRemove(currentUser.uid),
        sharedUids: arrayUnion(currentUser.uid)
      });

      toast.success(`Accepted share invitation for "${book.name}"!`);
      navigate(`/cashbook/${book.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to accept share request.");
    }
  };

  const handleDeclineInvite = async (book) => {
    try {
      const emailKey = currentUser?.email?.toLowerCase().replace(/\./g, "_dot_");
      const cashbookRef = doc(db, "cashbooks", book.id);

      await updateDoc(cashbookRef, {
        [`sharedWith.${emailKey}.status`]: "REJECTED",
        sharedPendingUids: arrayRemove(currentUser.uid)
      });

      toast.success(`Declined share invitation for "${book.name}".`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to decline share request.");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const handleTogglePin = async (book) => {
    try {
      await updateDoc(doc(db, "cashbooks", book.id), {
        isPinned: !book.isPinned
      });
    } catch (err) {
      console.error("Failed to toggle pin", err);
    }
  };

  const sortBooks = (list) => {
    return [...list].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return dateB - dateA;
    });
  };

  const ownedLedgers = sortBooks(cashbooks.filter(b => b.userId === currentUser?.uid));
  const sharedLedgers = sortBooks(cashbooks.filter(b => b.userId !== currentUser?.uid));

  const userName = userProfile?.name || currentUser?.displayName || currentUser?.email?.split("@")[0] || "User";
  const firstName = userName.split(" ")[0];
  const avatarPhoto = userProfile?.photoURL || currentUser?.photoURL;
  const firstLetter = userName.charAt(0).toUpperCase();

  if (loadingBooks) {
    return <LoadingScreen message="Loading your ledgers..." />;
  }

  return (
    <div className="pb-12 min-h-screen">
      
      {/* MODALS */}
      <CreateLedgerModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      
      <ShareLedgerModal 
        cashbook={sharingBook} 
        isOpen={Boolean(sharingBook)} 
        onClose={() => setSharingBook(null)} 
      />

      {/* HEADER */}
      <header className="flex justify-between items-center p-5 bg-bgMain/80 backdrop-blur-md border-b border-borderLight sticky top-0 z-10 flex-wrap gap-3">
        
        {/* User Profile Avatar & Greeting */}
        <div 
          onClick={() => navigate("/profile")} 
          className="flex items-center gap-3 cursor-pointer group"
          title="Open User Profile"
        >
          {avatarPhoto ? (
            <img 
              src={avatarPhoto} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full object-cover border-2 border-brandBlue group-hover:scale-105 transition-transform" 
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-brandBlue/30 border-2 border-brandBlue flex items-center justify-center text-lg font-bold text-brandBlue group-hover:scale-105 transition-transform">
              {firstLetter}
            </div>
          )}

          <div>
            <span className="text-xs text-textMuted block">Welcome back,</span>
            <h1 className="text-base font-bold m-0 text-textMain group-hover:text-brandBlue transition-colors">
              Hello, {firstName} 👋
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="py-2 px-3.5 bg-brandBlue text-white border-none rounded-lg font-semibold text-xs cursor-pointer shadow-md transition-all hover:bg-blue-800"
          >
            + New Ledger
          </button>
          
          <button
            onClick={() => navigate("/manage-ledgers")}
            className="py-2 px-3 bg-white/10 text-white border border-white/20 rounded-lg cursor-pointer text-xs transition-colors hover:bg-white/20"
          >
            Manage Ledgers
          </button>

          <button 
            onClick={handleLogout} 
            className="bg-transparent border-none text-cashOut font-semibold cursor-pointer text-xs py-2 px-2.5 rounded-md transition-colors hover:bg-cashOutBg"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="p-5 max-w-6xl mx-auto flex flex-col gap-8 w-full min-w-0">
        {error && (
          <div className="p-3 bg-cashOutBg text-cashOut rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* LOADING STATE */}
        {loadingBooks ? (
          <div className="text-center py-10 text-textMuted">
            Loading your ledgers...
          </div>
        ) : (
          <>
            {/* SECTION 0: PENDING SHARE REQUESTS */}
            {pendingBooks.length > 0 && (
              <div className="min-w-0 w-full bg-amber-500/10 p-4 rounded-2xl border border-amber-500/30">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-bold text-amber-300 m-0 flex items-center gap-2">
                    📩 Pending Share Requests ({pendingBooks.length})
                  </h2>

                  <div className="flex items-center gap-1 bg-white/5 border border-borderLight rounded-lg p-0.5">
                    <button 
                      onClick={() => scrollContainer(pendingScrollRef, "left")}
                      className="w-7 h-7 flex items-center justify-center rounded-md border-none bg-transparent text-textMuted hover:text-white hover:bg-white/10 cursor-pointer text-sm font-bold transition-colors"
                      title="Scroll Left"
                    >
                      ‹
                    </button>
                    <button 
                      onClick={() => scrollContainer(pendingScrollRef, "right")}
                      className="w-7 h-7 flex items-center justify-center rounded-md border-none bg-transparent text-textMuted hover:text-white hover:bg-white/10 cursor-pointer text-sm font-bold transition-colors"
                      title="Scroll Right"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div 
                  ref={pendingScrollRef}
                  onWheel={(e) => handleWheelScroll(e, pendingScrollRef)}
                  className="flex gap-4 overflow-x-auto pb-3 pt-1 w-full min-w-0 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-amber-500/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5"
                >
                  {pendingBooks.map((book) => (
                    <div key={book.id} className="min-w-[300px] max-w-[340px] w-[320px] shrink-0">
                      <PendingInviteCard 
                        book={book}
                        currentUser={currentUser}
                        onAccept={handleAcceptInvite}
                        onDecline={handleDeclineInvite}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 1: YOUR LEDGERS */}
            <div className="min-w-0 w-full bg-white/[0.02] p-4 rounded-2xl border border-borderLight/40">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-textMain m-0 flex items-center gap-2">
                  👑 Your Ledgers ({ownedLedgers.length})
                </h2>

                <div className="flex items-center gap-3">
                  {ownedLedgers.length > 0 && (
                    <div className="flex items-center gap-1 bg-white/5 border border-borderLight rounded-lg p-0.5">
                      <button 
                        onClick={() => scrollContainer(ownedScrollRef, "left")}
                        className="w-7 h-7 flex items-center justify-center rounded-md border-none bg-transparent text-textMuted hover:text-white hover:bg-white/10 cursor-pointer text-sm font-bold transition-colors"
                        title="Scroll Left"
                      >
                        ‹
                      </button>
                      <button 
                        onClick={() => scrollContainer(ownedScrollRef, "right")}
                        className="w-7 h-7 flex items-center justify-center rounded-md border-none bg-transparent text-textMuted hover:text-white hover:bg-white/10 cursor-pointer text-sm font-bold transition-colors"
                        title="Scroll Right"
                      >
                        ›
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={() => setShowCreateModal(true)} 
                    className="bg-transparent border-none text-brandBlue text-xs font-semibold cursor-pointer hover:underline"
                  >
                    + Create New
                  </button>
                </div>
              </div>

              {ownedLedgers.length > 0 ? (
                <div 
                  ref={ownedScrollRef}
                  onWheel={(e) => handleWheelScroll(e, ownedScrollRef)}
                  className="flex gap-4 overflow-x-auto pb-3 pt-1 w-full min-w-0 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-brandBlue/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5"
                >
                  {ownedLedgers.map((book) => (
                    <div key={book.id} className="min-w-[280px] max-w-[320px] w-[300px] shrink-0">
                      <LedgerCard 
                        book={book}
                        currentUser={currentUser}
                        onTogglePin={handleTogglePin} 
                        onOpenLedger={(id) => navigate(`/cashbook/${id}`)}
                        onShareLedger={(b) => setSharingBook(b)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card text-center py-8 px-4 border-dashed border-borderLight">
                  <div className="text-3xl mb-2">📓</div>
                  <p className="text-textMuted text-sm m-0">You don't own any ledgers yet. Tap "+ New Ledger" to create one.</p>
                </div>
              )}
            </div>

            {/* SECTION 2: SHARED LEDGERS */}
            <div className="min-w-0 w-full bg-white/[0.02] p-4 rounded-2xl border border-borderLight/40">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-textMain m-0 flex items-center gap-2">
                  👥 Shared Ledgers ({sharedLedgers.length})
                </h2>

                {sharedLedgers.length > 0 && (
                  <div className="flex items-center gap-1 bg-white/5 border border-borderLight rounded-lg p-0.5">
                    <button 
                      onClick={() => scrollContainer(sharedScrollRef, "left")}
                      className="w-7 h-7 flex items-center justify-center rounded-md border-none bg-transparent text-textMuted hover:text-white hover:bg-white/10 cursor-pointer text-sm font-bold transition-colors"
                      title="Scroll Left"
                    >
                      ‹
                    </button>
                    <button 
                      onClick={() => scrollContainer(sharedScrollRef, "right")}
                      className="w-7 h-7 flex items-center justify-center rounded-md border-none bg-transparent text-textMuted hover:text-white hover:bg-white/10 cursor-pointer text-sm font-bold transition-colors"
                      title="Scroll Right"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>

              {sharedLedgers.length > 0 ? (
                <div 
                  ref={sharedScrollRef}
                  onWheel={(e) => handleWheelScroll(e, sharedScrollRef)}
                  className="flex gap-4 overflow-x-auto pb-3 pt-1 w-full min-w-0 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-brandBlue/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5"
                >
                  {sharedLedgers.map((book) => (
                    <div key={book.id} className="min-w-[280px] max-w-[320px] w-[300px] shrink-0">
                      <LedgerCard 
                        book={book}
                        currentUser={currentUser}
                        onTogglePin={handleTogglePin} 
                        onOpenLedger={(id) => navigate(`/cashbook/${id}`)}
                        onShareLedger={(b) => setSharingBook(b)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card text-center py-8 px-4 border-dashed border-borderLight">
                  <div className="text-3xl mb-2">🤝</div>
                  <p className="text-textMuted text-sm m-0">No ledgers have been shared with you yet.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
