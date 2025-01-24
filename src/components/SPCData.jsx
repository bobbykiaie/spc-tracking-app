import React, { useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

export default function SPCData() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedInspectionId, setSelectedInspectionId] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [mean, setMean] = useState(0);
  const [ucl, setUcl] = useState(0);
  const [lcl, setLcl] = useState(0);
  const [cpk, setCpk] = useState(null);

  // Mock dataset
  const products = [
    {
      name: "SOFIA",
      MPs: [
        {
          name: "MPSOFIA1",
          inspections: [
            { id: "MPSOFIA1-Inspection1", name: "Inspection 1", data: [8, 10, 9, 12, 11] },
            { id: "MPSOFIA1-Inspection2", name: "Inspection 2", data: [10, 12, 13, 14, 12] },
            { id: "MPSOFIA1-Inspection3", name: "Inspection 3", data: [9, 11, 10, 12, 14] },
          ],
        },
        {
          name: "MPSOFIA2",
          inspections: [
            { id: "MPSOFIA2-Inspection1", name: "Inspection 1", data: [15, 13, 12, 16, 14] },
            { id: "MPSOFIA2-Inspection2", name: "Inspection 2", data: [12, 14, 13, 15, 13] },
            { id: "MPSOFIA2-Inspection3", name: "Inspection 3", data: [13, 15, 14, 16, 15] },
          ],
        },
        {
          name: "MPSOFIA3",
          inspections: [
            { id: "MPSOFIA3-Inspection1", name: "Inspection 1", data: [10, 9, 8, 11, 10] },
            { id: "MPSOFIA3-Inspection2", name: "Inspection 2", data: [11, 10, 9, 12, 11] },
            { id: "MPSOFIA3-Inspection3", name: "Inspection 3", data: [9, 8, 10, 9, 11] },
          ],
        },
      ],
    },
    {
      name: "WEB",
      MPs: [
        {
          name: "MPWEB1",
          inspections: [
            { id: "MPWEB1-Inspection1", name: "Inspection 1", data: [10, 12, 14, 11, 13] },
            { id: "MPWEB1-Inspection2", name: "Inspection 2", data: [9, 10, 12, 11, 13] },
            { id: "MPWEB1-Inspection3", name: "Inspection 3", data: [8, 9, 10, 11, 12] },
          ],
        },
        {
          name: "MPWEB2",
          inspections: [
            { id: "MPWEB2-Inspection1", name: "Inspection 1", data: [10, 11, 13, 12, 14] },
            { id: "MPWEB2-Inspection2", name: "Inspection 2", data: [11, 12, 14, 13, 15] },
            { id: "MPWEB2-Inspection3", name: "Inspection 3", data: [12, 14, 16, 15, 17] },
          ],
        },
        {
          name: "MPWEB3",
          inspections: [
            { id: "MPWEB3-Inspection1", name: "Inspection 1", data: [9, 8, 7, 10, 9] },
            { id: "MPWEB3-Inspection2", name: "Inspection 2", data: [10, 9, 8, 11, 10] },
            { id: "MPWEB3-Inspection3", name: "Inspection 3", data: [11, 10, 9, 12, 11] },
          ],
        },
      ],
    },
    {
      name: "WEDGE",
      MPs: [
        {
          name: "MPWEDGE1",
          inspections: [
            { id: "MPWEDGE1-Inspection1", name: "Inspection 1", data: [12, 14, 13, 15, 14] },
            { id: "MPWEDGE1-Inspection2", name: "Inspection 2", data: [10, 11, 12, 13, 14] },
            { id: "MPWEDGE1-Inspection3", name: "Inspection 3", data: [11, 12, 11, 10, 12] },
          ],
        },
        {
          name: "MPWEDGE2",
          inspections: [
            { id: "MPWEDGE2-Inspection1", name: "Inspection 1", data: [9, 10, 8, 11, 9] },
            { id: "MPWEDGE2-Inspection2", name: "Inspection 2", data: [10, 12, 11, 13, 12] },
            { id: "MPWEDGE2-Inspection3", name: "Inspection 3", data: [12, 11, 10, 13, 11] },
          ],
        },
        {
          name: "MPWEDGE3",
          inspections: [
            { id: "MPWEDGE3-Inspection1", name: "Inspection 1", data: [11, 10, 9, 12, 11] },
            { id: "MPWEDGE3-Inspection2", name: "Inspection 2", data: [10, 11, 10, 12, 11] },
            { id: "MPWEDGE3-Inspection3", name: "Inspection 3", data: [9, 10, 11, 10, 12] },
          ],
        },
      ],
    },
  ];

  // Handle product selection
  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setSelectedInspectionId(null); // Reset selected inspection
    setChartData([]); // Reset chart data
    setCpk(null); // Reset Cpk
  };

  // Handle inspection selection
  const handleInspectionClick = (inspection) => {
    const meanValue = inspection.data.reduce((a, b) => a + b, 0) / inspection.data.length;
    const range = 3; // Assume 3-sigma for control limits
    const upperControlLimit = meanValue + range;
    const lowerControlLimit = meanValue - range;

    // Calculate standard deviation
    const stddev = Math.sqrt(
      inspection.data.reduce((a, b) => a + Math.pow(b - meanValue, 2), 0) / inspection.data.length
    );

    // Assume specification limits for Cpk calculation
    const usl = upperControlLimit + 3; // Example upper spec limit
    const lsl = lowerControlLimit - 3; // Example lower spec limit

    // Calculate Cpk
    const cpkValue = Math.min((usl - meanValue) / (3 * stddev), (meanValue - lsl) / (3 * stddev));

    setSelectedInspectionId(inspection.id);
    setChartData(inspection.data);
    setMean(meanValue);
    setUcl(upperControlLimit);
    setLcl(lowerControlLimit);
    setCpk(cpkValue.toFixed(2)); // Set Cpk value with 2 decimal places
  };

  // Chart data
  const data = {
    labels: chartData.map((_, index) => `Sample ${index + 1}`), // X-axis labels
    datasets: [
      {
        label: selectedInspectionId || "Sample Data",
        data: chartData,
        borderColor: "blue",
        backgroundColor: "rgba(0, 0, 255, 0.1)",
        fill: true,
        tension: 0.4, // Smooth lines
      },
      {
        label: "Mean",
        data: Array(chartData.length).fill(mean),
        borderColor: "green",
        borderDash: [5, 5],
      },
      {
        label: "UCL (Upper Control Limit)",
        data: Array(chartData.length).fill(ucl),
        borderColor: "red",
        borderDash: [10, 5],
      },
      {
        label: "LCL (Lower Control Limit)",
        data: Array(chartData.length).fill(lcl),
        borderColor: "red",
        borderDash: [10, 5],
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: "Value",
        },
      },
      x: {
        title: {
          display: true,
          text: "Samples",
        },
      },
    },
  };

  return (
    <div className="flex flex-row min-h-screen">
      <div className="w-1/4 p-4 bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Products</h1>
        {products.map((product) => (
          <div
            key={product.name}
            onClick={() => handleProductClick(product)}
            className={`p-4 mb-4 cursor-pointer rounded-lg shadow-md ${
              selectedProduct?.name === product.name ? "bg-blue-200" : "bg-white"
            } hover:bg-blue-100`}
          >
            <h2 className="text-xl font-semibold text-center">{product.name}</h2>
          </div>
        ))}

        {selectedProduct && (
          <div>
            <h2 className="text-xl font-bold mt-6 mb-4">{selectedProduct.name} - MPs</h2>
            {selectedProduct.MPs.map((mp) => (
              <div key={mp.name} className="mb-4">
                <h3 className="font-semibold mb-2">{mp.name}</h3>
                {mp.inspections.map((inspection) => (
                  <button
                    key={inspection.id}
                    onClick={() => handleInspectionClick(inspection)}
                    className={`block w-full text-left px-4 py-2 rounded-lg ${
                      selectedInspectionId === inspection.id
                        ? "bg-blue-300"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {inspection.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-grow p-4">
        <h1 className="text-2xl font-bold mb-4">SPC Chart</h1>
        <Line data={data} options={options} />
        {cpk !== null && (
          <p className="mt-4 text-lg font-semibold">Process Capability (Cpk): {cpk}</p>
        )}
      </div>
    </div>
  );
}
