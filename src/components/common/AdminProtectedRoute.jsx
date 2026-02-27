import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const AdminProtectedRoute = () => {
  const token = localStorage.getItem("shaj_admin_token");
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
};

export default AdminProtectedRoute;
