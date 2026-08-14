import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login"; 
import Dashboard from "./pages/Dashboard";
import Ledger from "./pages/Ledger";
import Profile from "./pages/Profile";
import "./App.css"; // Ensures any future app styles load
import ManageLedgers from "./pages/ManageLedgers";
import BulkAdd from "./pages/BulkAdd";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <Router>
      <AuthProvider>
        {/* THIS DIV IS NEW: It creates the responsive app shell */}
        <div className="app-container">
          <Toaster 
            position="top-center" 
            toastOptions={{
              style: {
                background: 'rgba(25, 25, 35, 0.9)',
                color: '#fff',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }
            }} 
          />
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            <Route path="/cashbook/:id" element={<ProtectedRoute><Ledger /></ProtectedRoute>} />
            <Route path="/cashbook/:id/bulk-add" element={<ProtectedRoute><BulkAdd /></ProtectedRoute>} />
            <Route path="/manage-ledgers" element={<ProtectedRoute><ManageLedgers /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;