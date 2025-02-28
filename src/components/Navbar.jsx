import { Link } from "react-router-dom";
import axios from "axios";

export default function Navbar({ user, refreshUser }) {
  const handleLogout = async () => {
    try {
      await axios.post("http://localhost:5000/logout", {}, { withCredentials: true });
      refreshUser(); // ✅ Refresh user state immediately
    } catch (error) {
      console.error("❌ Logout error:", error);
    }
  };

  return (
    <nav className="bg-blue-600 shadow-md py-4 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
        <Link to="/spc-tracking-app/Home" className="text-3xl font-bold text-white tracking-tight hover:text-blue-200 transition-colors duration-300">
          Tracker Pro
        </Link>
        <div className="flex items-center space-x-6">
          <Link
            to="/spc-tracking-app/Home"
            className="text-lg font-medium text-white hover:text-blue-200 transition-colors duration-300 px-3 py-2 rounded-md hover:bg-blue-700 hover:bg-opacity-20"
          >
            Home
          </Link>
          <Link
            to="/spc-tracking-app/reports"
            className="text-lg font-medium text-white hover:text-blue-200 transition-colors duration-300 px-3 py-2 rounded-md hover:bg-blue-700 hover:bg-opacity-20"
          >
            Reports
          </Link>
          <Link
            to="/spc-tracking-app/spc-data"
            className="text-lg font-medium text-white hover:text-blue-200 transition-colors duration-300 px-3 py-2 rounded-md hover:bg-blue-700 hover:bg-opacity-20"
          >
            SPC Data
          </Link>

          {user && (
            <Link
              to="/spc-tracking-app/active-build"
              className="text-lg font-medium text-white hover:text-blue-200 transition-colors duration-300 px-3 py-2 rounded-md hover:bg-blue-700 hover:bg-opacity-20"
            >
              Active Build
            </Link>
          )}

          {user ? (
            <button
              onClick={handleLogout}
              className="text-lg font-medium text-white hover:text-blue-200 transition-colors duration-300 px-3 py-2 rounded-md hover:bg-red-700 hover:bg-opacity-20"
            >
              Logout ({user.username})
            </button>
          ) : (
            <Link
              to="/spc-tracking-app/login"
              className="text-lg font-medium text-white hover:text-blue-200 transition-colors duration-300 px-3 py-2 rounded-md hover:bg-blue-700 hover:bg-opacity-20"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}