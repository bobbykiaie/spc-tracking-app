import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Admin() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [mpList, setMpList] = useState([]);
  const [newMP, setNewMP] = useState({ mp_number: "", procedure_name: "", spec_detail: "" });

  // 🟢 Fetch products on load
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get("http://localhost:5000/products");
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  // 🟢 Fetch MPs for selected product
  const handleSelectProduct = async (product) => {
    setSelectedProduct(product);
    try {
      const response = await axios.get(`http://localhost:5000/manufacturing_procedures/${product.mvd_number}`);
      setMpList(response.data);
    } catch (error) {
      console.error("Error fetching MPs:", error);
    }
  };

  // 🟢 Add a new MP to selected product
  const handleAddMP = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      alert("Please select a product first!");
      return;
    }
    try {
      await axios.post("http://localhost:5000/config_mp_specs", {
        config_number: selectedProduct.mvd_number,
        mp_number: newMP.mp_number,
        spec_detail: newMP.spec_detail,
      });
      handleSelectProduct(selectedProduct); // Refresh MP list
      setNewMP({ mp_number: "", procedure_name: "", spec_detail: "" });
    } catch (error) {
      console.error("Error adding MP:", error);
    }
  };

  // 🟢 Remove an MP from a product
  const handleDeleteMP = async (mp_number) => {
    if (!window.confirm("Are you sure you want to remove this MP?")) return;
    try {
      await axios.delete("http://localhost:5000/config_mp_specs", {
        data: { config_number: selectedProduct.mvd_number, mp_number },
      });
      handleSelectProduct(selectedProduct); // Refresh MP list
    } catch (error) {
      console.error("Error deleting MP:", error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Panel - MP Management</h1>

      {/* 🟢 Select Product */}
      <h2 className="text-xl font-bold mb-2">Select a Product</h2>
      <ul className="mb-4">
        {products.map((product) => (
          <li
            key={product.mvd_number}
            className="p-2 border rounded-lg cursor-pointer"
            onClick={() => handleSelectProduct(product)}
          >
            {product.product_name} ({product.mvd_number})
          </li>
        ))}
      </ul>

      {/* 🟢 Show MPs for Selected Product */}
      {selectedProduct && (
        <>
          <h2 className="text-xl font-bold mt-4 mb-2">Manufacturing Procedures for {selectedProduct.product_name}</h2>
          <ul className="mb-4">
            {mpList.length === 0 ? (
              <p>No MPs found. Add one below.</p>
            ) : (
              mpList.map((mp) => (
                <li key={mp.mp_number} className="p-2 border rounded-lg flex justify-between">
                  {mp.procedure_name} ({mp.mp_number})
                  <button onClick={() => handleDeleteMP(mp.mp_number)} className="bg-red-500 text-white px-2 py-1 rounded">
                    Remove
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* 🟢 Add New MP */}
          <h2 className="text-xl font-bold mt-4 mb-2">Add Manufacturing Procedure</h2>
          <form onSubmit={handleAddMP} className="space-y-2">
            <input
              type="text"
              placeholder="MP Number"
              value={newMP.mp_number}
              onChange={(e) => setNewMP({ ...newMP, mp_number: e.target.value })}
              className="p-2 border rounded-lg w-full"
              required
            />
            <input
              type="text"
              placeholder="Specification Detail"
              value={newMP.spec_detail}
              onChange={(e) => setNewMP({ ...newMP, spec_detail: e.target.value })}
              className="p-2 border rounded-lg w-full"
              required
            />
            <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded-lg shadow-md">
              Add MP
            </button>
          </form>
        </>
      )}
    </div>
  );
}
