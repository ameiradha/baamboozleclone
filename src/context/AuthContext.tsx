import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, testConnection } from '../lib/firebase';
import { UserProfile } from '../types/game';

interface AuthContextType {
  currentUser: UserProfile | null;
  isDemoUser: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginAsDemoTeacher: () => void;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_TEACHER_KEY = 'quizbattle_teacher_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load initial test connection and local session
  useEffect(() => {
    testConnection();

    // Check LocalStorage demo or cached teacher
    const saved = localStorage.getItem(LOCAL_TEACHER_KEY);
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch {
        // ignore
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        // Attempt to fetch profile from firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setCurrentUser(data);
            localStorage.setItem(LOCAL_TEACHER_KEY, JSON.stringify(data));
          } else {
            const newProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || 'Teacher',
              photoURL: fbUser.photoURL || '',
              role: 'teacher',
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', fbUser.uid), newProfile);
            setCurrentUser(newProfile);
            localStorage.setItem(LOCAL_TEACHER_KEY, JSON.stringify(newProfile));
          }
        } catch {
          // If firestore read fails, fallback to Firebase User
          const profile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || 'Teacher',
            photoURL: fbUser.photoURL || '',
            role: 'teacher',
            createdAt: new Date().toISOString(),
          };
          setCurrentUser(profile);
          localStorage.setItem(LOCAL_TEACHER_KEY, JSON.stringify(profile));
        }
      } else {
        // If not in Firebase Auth, check if local demo teacher is still active
        const localTeacher = localStorage.getItem(LOCAL_TEACHER_KEY);
        if (localTeacher) {
          try {
            setCurrentUser(JSON.parse(localTeacher));
          } catch {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.warn('Google sign-in popup closed or cancelled', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (name: string, email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: email,
        displayName: name,
        photoURL: '',
        role: 'teacher',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      setCurrentUser(newProfile);
      localStorage.setItem(LOCAL_TEACHER_KEY, JSON.stringify(newProfile));
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const loginAsDemoTeacher = () => {
    const demoProfile: UserProfile = {
      uid: 'teacher_demo_101',
      displayName: 'Teacher Sarah',
      email: 'sarah.teacher@school.edu',
      photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      role: 'teacher',
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(demoProfile);
    localStorage.setItem(LOCAL_TEACHER_KEY, JSON.stringify(demoProfile));
  };

  const updateUserProfile = async (displayName: string, photoURL?: string) => {
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      displayName,
      photoURL: photoURL !== undefined ? photoURL : currentUser.photoURL,
    };
    setCurrentUser(updated);
    localStorage.setItem(LOCAL_TEACHER_KEY, JSON.stringify(updated));

    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName, photoURL: photoURL || undefined });
        await setDoc(doc(db, 'users', currentUser.uid), updated, { merge: true });
      } catch {
        // ignore
      }
    }
  };

  const logout = async () => {
    localStorage.removeItem(LOCAL_TEACHER_KEY);
    setCurrentUser(null);
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isDemoUser: currentUser?.uid === 'teacher_demo_101',
        loading,
        signInWithGoogle,
        registerWithEmail,
        loginWithEmail,
        resetPassword,
        loginAsDemoTeacher,
        updateUserProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
