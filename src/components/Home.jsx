import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Home({ user, refreshUser }) {  // ✅ Pass user & refreshUser as props
    const [lotNumber, setLotNumber] = useState("");
    const [mpList, setMpList] = useState([]);
    const [selectedMP, setSelectedMP] = useState(null);
    const [error, setError] = useState("");
    const [activeBuild, setActiveBuild] = useState(null);

    // ✅ Fetch active build when user logs in or a build starts
    useEffect(() => {
        if (user) {
            fetchActiveBuild(user.username);
        } else {
            setActiveBuild(null); // ✅ Reset when user logs out
        }
    }, [user]); // ✅ UI updates when `user` state changes

    // ✅ Fetch active build from backend
    const fetchActiveBuild = async (username) => {
        try {
            const response = await axios.get("http://localhost:5000/active_builds", { withCredentials: true });
            const userBuild = response.data.find(b => b.username === username);
            setActiveBuild(userBuild || null);
        } catch (error) {
            setActiveBuild(null);
        }
    };

    // ✅ Search for MPs based on Lot Number
    const handleSearchLot = async () => {
        if (!lotNumber.trim()) {
            setError("Please enter a lot number.");
            return;
        }

        try {
            const response = await axios.get(`http://localhost:5000/manufacturing_procedures/by-lot/${lotNumber}`);
            if (response.data.length > 0) {
                setMpList(response.data);
                setSelectedMP(null);
                setError("");
            } else {
                setMpList([]);
                setError("No MPs found for this lot number.");
            }
        } catch (error) {
            setError("Lot number not found.");
        }
    };

    // ✅ Handle selecting an MP
    const handleSelectMP = (mp) => {
        setSelectedMP(mp);
    };

    // ✅ Handle starting a build and refresh UI
    const handleStartBuild = async () => {
        if (!selectedMP) return;

        try {
            await axios.post("http://localhost:5000/start_build", {
                username: user.username,
                lot_number: lotNumber,
                mp_number: selectedMP.mp_number,
            }, { withCredentials: true });

            await fetchActiveBuild(user.username); // ✅ Refresh active build
            setMpList([]); // ✅ Clear MP list
            setLotNumber(""); // ✅ Clear lot number field
            setSelectedMP(null); // ✅ Reset selection
        } catch (error) {
            console.error("❌ Error starting build:", error);
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Home</h1>

            {user ? (
                activeBuild ? (
                    // ✅ Show active build if running
                    <div className="bg-gray-100 p-4 rounded-lg shadow-md">
                        <h2 className="text-lg font-bold">Current Active Build</h2>
                        <p><strong>Lot Number:</strong> {activeBuild.lot_number}</p>
                        <p><strong>Configuration:</strong> {activeBuild.config_number}</p>
                        <p><strong>Manufacturing Procedure:</strong> {activeBuild.mp_number}</p>
                        <p><strong>Start Time:</strong> {activeBuild.start_time}</p>
                    </div>
                ) : (
                    // ✅ Show lot search if no active build
                    <>
                        <h2 className="text-lg font-bold">Welcome, {user.username}!</h2>
                        <p>Enter a **Lot Number** to find associated Manufacturing Procedures.</p>

                        <input
                            type="text"
                            placeholder="Enter Lot Number (e.g., LOT001)"
                            value={lotNumber}
                            onChange={(e) => setLotNumber(e.target.value)}
                            className="p-2 border rounded-lg w-full mt-2"
                        />

                        <button
                            onClick={handleSearchLot}
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md"
                        >
                            Search Lot
                        </button>

                        {error && <p className="text-red-500 mt-2">{error}</p>}

                        {mpList.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-lg font-bold">Manufacturing Procedures for Lot {lotNumber}:</h3>
                                <ul>
                                    {mpList.map((mp) => (
                                        <li
                                            key={mp.mp_number}
                                            onClick={() => handleSelectMP(mp)}
                                            className={`p-2 border rounded-lg shadow-md mt-2 cursor-pointer ${
                                                selectedMP?.mp_number === mp.mp_number ? "bg-blue-200" : "bg-white"
                                            }`}
                                        >
                                            {mp.procedure_name} (MP#: {mp.mp_number})
                                        </li>
                                    ))}
                                </ul>

                                {selectedMP && (
                                    <button
                                        onClick={handleStartBuild}
                                        className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg shadow-md"
                                    >
                                        Start Build
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )
            ) : (
                <p className="text-red-500">Please log in to start a build.</p>
            )}
        </div>
    );
}
