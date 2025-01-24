import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
      <div className="text-2xl font-bold">Tracker Pro</div>
      <div className="flex space-x-8">
        <Link to="/" className="hover:text-gray-300 transition-colors">
          Home
        </Link>
        <Link to="/reports" className="hover:text-gray-300 transition-colors">
          Reports
        </Link>
        <Link to="/spc-data" className="hover:text-gray-300 transition-colors">
          SPC Data
        </Link>
      </div>
    </nav>
  );
}
