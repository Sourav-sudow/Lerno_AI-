import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { useState } from "react";

// LoginPage removed
import Dashboard from "./components/Dashboard"; // apna main page import karo

function App() {
  const [user, setUser] = useState<string | null>(null);

  return (
    <BrowserRouter>
      <Routes>
        {/* Agar user login nahi hai toh hamesha login page dikhao */}
        <Route
          path="/"
          element={
            user ? <Dashboard user={user} /> : <Navigate to="/landing" replace />
          }
        />
        {/* Baaki routes bhi isi tarah handle karo */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;