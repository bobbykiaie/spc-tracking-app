import React from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://spc-tracking-app-backend.onrender.com";

export default function Navbar({ user, refreshUser }) {
  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/logout`, {}, { withCredentials: true });
      refreshUser(); // Refresh user state immediately
    } catch (error) {
      console.error("❌ Logout error:", error);
    }
  };

  return (
    <nav className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center shadow-md">
      <div className="text-2xl font-bold">Tracker Pro</div>
      <div className="flex space-x-8">
        {/* Home link (visible to all logged-in users) */}
        <Link
          to="/spc-tracking-app/Home"
          className="hover:text-gray-300 transition-colors"
        >
          Home
        </Link>

        {/* Active Builds link (visible only to engineers) */}
        {user && user.role === 'engineer' && (
          <Link
            to="/spc-tracking-app/active-builds"
            className="hover:text-gray-300 transition-colors"
          >
            Active Builds
          </Link>
        )}

        {/* SPC link (visible only to engineers) */}
        {user && user.role === 'engineer' && (
          <Link
            to="/spc-tracking-app/spc"
            className="hover:text-gray-300 transition-colors"
          >
            SPC
          </Link>
        )}

        {/* Reports link (visible only to engineers) */}
        {user && user.role === 'engineer' && (
          <Link
            to="/spc-tracking-app/reports"
            className="hover:text-gray-300 transition-colors"
          >
            Reports
          </Link>
        )}

        {/* Active Build link (visible to all logged-in users, adjust as needed) */}
        {user && (
          <Link
            to="/spc-tracking-app/active-build"
            className="hover:text-gray-300 transition-colors"
          >
            Active Build
          </Link>
        )}

        {/* Login/Logout logic */}
        {user ? (
          <button
            onClick={handleLogout}
            className="hover:text-gray-300 transition-colors"
          >
            Logout ({user.username})
          </button>
        ) : (
          <Link
            to="/spc-tracking-app/login"
            className="hover:text-gray-300 transition-colors"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}