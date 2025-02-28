import React, { useState, useEffect } from "react";
import axios from "axios";

export default function ActiveBuild({ user, refreshUser }) {
    const [activeBuild, setActiveBuild] = useState(null);
    const [lotDetails, setLotDetails] = useState(null);
    const [specs, setSpecs] = useState([]);
    const [inspections, setInspections] = useState([]);
    const [selectedSample, setSelectedSample] = useState(1);
    const [inspectionValues, setInspectionValues] = useState({});
    const [passFailValues, setPassFailValues] = useState({});

    useEffect(() => {
        if (user) {
            fetchActiveBuild(user.username);
        }
    }, [user]);

    useEffect(() => {
        if (activeBuild) {
            fetchSpecs(activeBuild.config_number, activeBuild.mp_number);
            fetchInspectionLogs();
        }
    }, [activeBuild]);

    const fetchInspectionLogs = async () => {
        if (activeBuild) {
            try {
                const response = await axios.get(
                    `http://localhost:5000/inspection_logs/${activeBuild.lot_number}/${activeBuild.mp_number}`
                );
                setInspections(response.data || []);
            } catch (error) {
                console.error("Error fetching inspection logs:", error);
                setInspections([]);
            }
        }
    };

    const fetchActiveBuild = async (username) => {
        try {
            const response = await axios.get(`http://localhost:5000/active_builds/${username}`);
            setActiveBuild(response.data);

            if (response.data) {
                fetchLotDetails(response.data.lot_number);
                fetchSpecs(response.data.config_number, response.data.mp_number);
                fetchInspectionLogs();
            }
        } catch (error) {
            setActiveBuild(null);
            console.error("Error fetching active build:", error);
        }
    };

    const fetchLotDetails = async (lotNumber) => {
        try {
            const response = await axios.get(`http://localhost:5000/lots/${lotNumber}`);
            setLotDetails(response.data);
        } catch (error) {
            console.error("Error fetching lot details:", error);
        }
    };

    const fetchSpecs = async (configNumber, mpNumber) => {
        try {
            const response = await axios.get(`http://localhost:5000/specs/by-config-mp/${configNumber}/${mpNumber}`);
            setSpecs(response.data);
        } catch (error) {
            console.error("Error fetching specs:", error);
        }
    };

    const handleLogInspection = async (spec) => {
        const inspectionType = spec.type;
        const inspectionValue = inspectionType === "Variable" ? parseFloat(inspectionValues[spec.spec_name]) : null;
        const passFail = inspectionType === "Attribute" ? passFailValues[spec.spec_name] || "Pass" : null; // Ensure pass/fail is not null

        try {
            await axios.post("http://localhost:5000/log_inspection", {
                username: user.username,
                lot_number: activeBuild.lot_number,
                config_number: activeBuild.config_number,
                mp_number: activeBuild.mp_number,
                spec_name: spec.spec_name,
                inspection_type: inspectionType,
                unit_number: selectedSample,
                inspection_value: inspectionType === "Attribute" ? passFail : inspectionValue, // Attribute: Save Pass/Fail
                pass_fail: passFail, // Ensure Pass/Fail is logged
            });

            await fetchInspectionLogs();
        } catch (error) {
            console.error("Error logging inspection:", error);
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Active Build</h1>
            {activeBuild ? (
                <div className="grid grid-cols-2 gap-4">
                    {/* Left Side: Sample Table */}
                    <div className="bg-gray-100 p-4 rounded-lg shadow-md">
                        <h2 className="text-lg font-bold">Current Build</h2>
                        <p><strong>Lot Number:</strong> {activeBuild.lot_number}</p>
                        <p><strong>Configuration:</strong> {activeBuild.config_number}</p>
                        <p><strong>Manufacturing Procedure:</strong> {activeBuild.mp_number}</p>
                        {lotDetails && <p><strong>Quantity:</strong> {lotDetails.quantity} units</p>}
                        
                        {/* Sample Table */}
                        <table className="w-full mt-4 border-collapse border border-gray-400">
                            <thead>
                                <tr className="bg-gray-300">
                                    <th className="border border-gray-400 px-2 py-1">Sample</th>
                                    {specs.map(spec => (
                                        <th key={spec.spec_name} className="border border-gray-400 px-2 py-1">{spec.spec_name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[...Array(lotDetails?.quantity || 10).keys()].map((i) => {
                                    const unitNumber = i + 1;
                                    return (
                                        <tr key={unitNumber} className={selectedSample === unitNumber ? "bg-blue-300" : "hover:bg-gray-200"} onClick={() => setSelectedSample(unitNumber)}>
                                            <td className="border border-gray-400 px-2 py-1">{unitNumber}</td>
                                            {specs.map(spec => {
                                                const inspection = inspections.find(ins => ins.unit_number === unitNumber && ins.spec_name === spec.spec_name);
                                                return (
                                                    <td key={spec.spec_name} className="border border-gray-400 px-2 py-1">
                                                        {inspection ? (inspection.pass_fail === "Pass" ? "✅" : "❌") : ""}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Right Side: Inspections for Selected Sample */}
                    <div className="bg-gray-100 p-4 rounded-lg shadow-md">
                        <h2 className="text-lg font-bold">Inspections for Sample {selectedSample}</h2>
                        {specs.map((spec) => (
                            <div key={spec.spec_name} className="mt-4">
                                <p><strong>{spec.spec_name} ({spec.type})</strong></p>
                                {spec.type === "Variable" ? (
                                    <input
                                        type="number"
                                        placeholder="Enter Inspection Value"
                                        value={inspectionValues[spec.spec_name] || ""}
                                        onChange={(e) => setInspectionValues({...inspectionValues, [spec.spec_name]: e.target.value})}
                                        className="p-2 border rounded-lg w-full mt-2"
                                    />
                                ) : (
                                    <select 
                                        value={passFailValues[spec.spec_name] || "Pass"} 
                                        onChange={(e) => setPassFailValues({...passFailValues, [spec.spec_name]: e.target.value})} 
                                        className="p-2 border rounded-lg w-full mt-2"
                                    >
                                        <option value="Pass">Pass</option>
                                        <option value="Fail">Fail</option>
                                    </select>
                                )}
                                <button onClick={() => handleLogInspection(spec)} className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg">Log Inspection</button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <p>No MPs have started yet.</p>
            )}
        </div>
    );
}
