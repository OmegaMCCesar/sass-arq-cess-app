import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebaseConfig";
import { setDoc, doc } from "firebase/firestore";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("residente");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        role,
        createdAt: new Date(),
      });
      alert("Usuario creado");
      setEmail(""); setPassword("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Crear usuario</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="superadmin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="residente">Residente Ing/Arq</option>
          {/* no incluimos supervisor ni trabajador */}
        </select>
        <button type="submit">Crear</button>
      </form>
      {error && <p>{error}</p>}
    </div>
  );
}
