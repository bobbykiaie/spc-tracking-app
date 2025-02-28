import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Login({ refreshUser }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post(
        "http://localhost:5000/login",
        { username, password },
        { withCredentials: true }
      );
      console.log("✅ Login response:", response.data);
      refreshUser(); // ✅ Immediately refresh the user state
      navigate("/spc-tracking-app/Home"); // ✅ Redirect to Home
    } catch (err) {
      console.error("❌ Login Error:", err);
      setError("Invalid username or password");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center tracking-tight">Tracker Pro</h1>
        <h2 className="text-2xl font-semibold text-blue-700 mb-6 text-center">Login</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-gray-700 font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              placeholder="Enter Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm placeholder-gray-400 transition-all duration-300"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm placeholder-gray-400 transition-all duration-300"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors duration-300 shadow-md font-semibold text-lg"
          >
            Login
          </button>
        </form>
        {error && (
          <p className="text-red-500 text-center bg-red-100 p-4 mt-4 rounded-lg shadow-md">{error}</p>
        )}
      </div>
    </div>
  );
}