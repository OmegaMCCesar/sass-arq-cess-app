// src/contexts/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  auth,            // auth de la app principal
  db,              // firestore de la app principal
  firebaseConfig,  // necesario para inicializar la app secundaria
} from "../lib/firebaseConfig";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Suscripción a Auth + lectura de rol en Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setRole(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(fbUser);

      try {
        const ref = doc(db, "users", fbUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setRole(data.role ?? null);
          setProfile(data);
        } else {
          // Si no existe el doc, crea un placeholder mínimo (sin rol)
          const base = {
            uid: fbUser.uid,
            email: fbUser.email || "",
            role: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(ref, base, { merge: true });
          setRole(null);
          setProfile(base);
        }
      } catch (err) {
        console.error("AuthContext: error leyendo perfil:", err);
        setRole(null);
        setProfile(null);
      } finally {
        // Importante: bajar loading sólo cuando terminamos de leer Firestore
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Helpers de sesión
  const signIn = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const signOut = () => fbSignOut(auth);

  /**
   * Crear usuario (Auth) + documento en Firestore (users/{uid})
   * sin perder la sesión actual del superadmin/admin.
   * Usa una app secundaria para que createUser no cambie la sesión activa.
   */
  const createUserWithRole = async ({ email, password, role, extra = {} }) => {
    // 1) Inicializa app secundaria (si no existe)
    const secondaryApp =
      getApps().find((a) => a.name === "secondary") ||
      initializeApp(firebaseConfig, "secondary");

    const secondaryAuth = getAuth(secondaryApp);

    try {
      // 2) Crea usuario en la app secundaria (no altera la sesión actual)
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );
      const uid = cred.user.uid;

      // 3) Crea/actualiza doc en Firestore con permisos del usuario actual
      await setDoc(
        doc(db, "users", uid),
        {
          uid,
          email,
          role: role ?? null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...extra,
        },
        { merge: true }
      );

      return uid;
    } finally {
      // 4) Cierra sesión secundaria para limpiar
      try {
        await fbSignOut(secondaryAuth);
      } catch {
        /* noop */
      }
    }
  };

  const hasRole = (...allowed) => {
    if (!allowed || allowed.length === 0) return true;
    return allowed.includes(role);
  };

  const value = useMemo(
    () => ({
      user,
      role,
      profile,
      loading,
      signIn,
      signOut,
      hasRole,
      createUserWithRole,
    }),
    [user, role, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("useAuthContext debe usarse dentro de <AuthProvider />");
  return ctx;
}
