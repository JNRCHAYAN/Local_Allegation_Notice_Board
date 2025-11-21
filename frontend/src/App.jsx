// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing_page from "./pages/Landing_page";
import Login from "./pages/Login";
import Register from "./pages/Register";
import User_dashboard from "./pages/User_dashboard";
import New_complaint from "./pages/New_complaint";
import Organization_page from "./pages/Organization_page";
import Admin_home_page from "./pages/Admin_home_page";
import Anonymous_complaint from "./pages/Anonymous_complaint";
import { getToken } from "./utils/auth";


// NEW imports
import User_profile from "./pages/User_profile";
import User_notifications from "./pages/User_notifications";
import User_complaints from "./pages/User_complaints";
import User_settings from "./pages/User_settings";
import Help_page from "./pages/Help_page";
import Organization_profile from "./pages/Organization_profile";
import Organization_settings from "./pages/Organization_settings";
import Organization_notifications from "./pages/Organization_notifications";
import Department_page from "./pages/Department_page";

function PrivateRoute({ children }) {
  const token = getToken();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing_page />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/organization/:slug" element={<Organization_page />} />
        <Route path="/anonymous_complaint" element={<Anonymous_complaint />} />
        

        {/* Protected */}
        <Route
          path="/user/dashboard"
          element={
            <PrivateRoute>
              <User_dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/user/complaints/new"
          element={
            <PrivateRoute>
              <New_complaint />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/admin_home_page"
          element={
            <PrivateRoute>
              <Admin_home_page />
            </PrivateRoute>
          }
        />

        {/* Menu targets */}
        <Route
          path="/user/profile"
          element={
            <PrivateRoute>
              <User_profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/user/notifications"
          element={
            <PrivateRoute>
              <User_notifications />
            </PrivateRoute>
          }
        />
        <Route
          path="/user/complaints"
          element={
            <PrivateRoute>
              <User_complaints />
            </PrivateRoute>
          }
        />
        <Route
          path="/user/settings"
          element={
            <PrivateRoute>
              <User_settings />
            </PrivateRoute>
          }
        />
        {/* Organization admin pages – accessible only when logged in as organization */ }
        <Route
          path="/organization/profile"
          element={
            <PrivateRoute>
              <Organization_profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/organization/settings"
          element={
            <PrivateRoute>
              <Organization_settings />
            </PrivateRoute>
          }
        />
        <Route
          path="/organization/notifications"
          element={
            <PrivateRoute>
              <Organization_notifications />
            </PrivateRoute>
          }
        />
                {/* ---------- DEPARTMENT ---------- */}
        <Route
          path="/organization/:slug/department/:deptSlug"
          element={
            <PrivateRoute>
              <Department_page />
            </PrivateRoute>
          }
        />
        <Route path="/help" element={<Help_page />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
