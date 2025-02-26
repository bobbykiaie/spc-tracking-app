import React from "react";
import { useBuildData } from "./BuildDataContext";

export default function Reports() {
  const { buildData } = useBuildData();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Reports</h1>

      {buildData.length > 0 ? (
        <ul>
          {buildData.map((report, index) => (
            <li
              key={index}
              className="p-4 border rounded-lg shadow-md mb-4 bg-gray-100"
            >
              <h3 className="font-bold mb-2">{report.name}</h3>
              <ul>
                {report.data.map((sample, i) => (
                  <li key={i} className="p-2">
                    Sample {i + 1}: {sample.inspectionData}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-lg">No reports available.</p>
      )}
    </div>
  );
}
