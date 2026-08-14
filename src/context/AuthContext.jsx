/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync user profile document with Firestore
  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const userRef = doc(db, "users", user.uid);
        
        // Ensure user document exists
        try {
          const docSnap = await getDoc(userRef);
          if (!docSnap.exists()) {
            const defaultName = user.displayName || user.email?.split("@")[0] || "User";
            const defaultUsername = user.email?.split("@")[0] || `user_${user.uid.slice(0, 5)}`;
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email?.toLowerCase() || "",
              name: defaultName,
              username: defaultUsername,
              phone: user.phoneNumber || "",
              photoURL: user.photoURL || "",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.error("Error creating initial user document:", err);
        }

        // Real-time listener for user profile updates
        unsubProfile = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data());
          }
        });
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // Sign Up function
  const signup = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  // Login function
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Google Login function
  const loginWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  // Reset Password function
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // Logout function
  const logout = () => {
    return signOut(auth);
  };

  // Update Profile Data in Firestore
  const updateUserProfile = async (fields) => {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      ...fields,
      updatedAt: serverTimestamp(),
    });
  };

  // Update User Email
  const updateUserEmail = async (newEmail, currentPassword) => {
    if (!currentUser) return;
    if (currentPassword) {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
    }
    await firebaseUpdateEmail(currentUser, newEmail);
    await updateUserProfile({ email: newEmail.toLowerCase() });
  };

  // Update User Password
  const updateUserPassword = async (newPassword, currentPassword) => {
    if (!currentUser) return;
    if (currentPassword) {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
    }
    await firebaseUpdatePassword(currentUser, newPassword);
  };

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    loginWithGoogle,
    resetPassword,
    logout,
    updateUserProfile,
    updateUserEmail,
    updateUserPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
