import { Link } from "react-router-dom";
import axios from "axios";


export default function Navbar({ user, refreshUser }) {
  const handleLogout = async () => {
    try {
        await axios.post("http://localhost:5000/logout", {}, { withCredentials: true });
        refreshUser();  // ✅ Refresh user state immediately
    } catch (error) {
        console.error("❌ Logout error:", error);
    }
};




  return (
    <nav className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
      <div className="text-2xl font-bold">Tracker Pro</div>
      <div className="flex space-x-8">
        <Link to="/spc-tracking-app/Home" className="hover:text-gray-300 transition-colors">Home</Link>
        <Link to="/spc-tracking-app/reports" className="hover:text-gray-300 transition-colors">Reports</Link>
        <Link to="/spc-tracking-app/spc-data" className="hover:text-gray-300 transition-colors">SPC Data</Link>

        {user && (
          <Link to="/spc-tracking-app/active-build" className="hover:text-gray-300 transition-colors">
            Active Build
          </Link>
        )}

        {user ? (
          <button onClick={handleLogout} className="hover:text-gray-300 transition-colors">
            Logout ({user.username})
          </button>
        ) : (
          <Link to="/spc-tracking-app/login" className="hover:text-gray-300 transition-colors">Login</Link>
        )}
      </div>
    </nav>
  );
}
