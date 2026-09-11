import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import FamilySetup from "./pages/FamilySetup";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 dark:text-white">Загрузка...</div>;
  return user ? children : <Navigate to="/login" />;
}

function NoFamilyRoute({ children }) {
  const { profile, loading } = useAuth();
  if (loading) return <div className="p-8 dark:text-white">Загрузка...</div>;
  if (profile?.familyId) return <Navigate to="/" />;
  return children;
}

function WithFamilyRoute({ children }) {
  const { profile, loading } = useAuth();
  if (loading) return <div className="p-8 dark:text-white">Загрузка...</div>;
  if (!profile?.familyId) return <Navigate to="/family-setup" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/family-setup"
        element={
          <PrivateRoute>
            <NoFamilyRoute>
              <FamilySetup />
            </NoFamilyRoute>
          </PrivateRoute>
        }
      />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <WithFamilyRoute>
              <Home />
            </WithFamilyRoute>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}