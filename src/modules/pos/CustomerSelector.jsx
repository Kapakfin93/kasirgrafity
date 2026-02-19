import React, { useState, useEffect, useRef } from "react";
import { useCustomerStore } from "../../stores/useCustomerStore";
import { Trash2 } from "lucide-react";

export function CustomerSelector({
  customerSnapshot,
  updateCustomerSnapshot,
  isLocked,
}) {
  const { customers, loadCustomers, deleteCustomer } = useCustomerStore();
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1); // Keyboard Nav State
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleNameChange = (e) => {
    const input = e.target.value;
    updateCustomerSnapshot({ name: input, isNew: true });
    setSelectedIndex(-1); // Reset selection on input change

    if (input.length > 1) {
      const matches = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(input.toLowerCase()) ||
          (c.phone && c.phone.includes(input)),
      );
      setSuggestions(matches);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectCustomer = (customer) => {
    console.log("Pelanggan Lama Dipilih:", customer);
    updateCustomerSnapshot({
      id: customer.id,
      name: customer.name,
      phone: customer.phone || "",
      address: customer.address || "",
      isNew: false,
    });
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Keyboard Navigation Handler
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0) {
        selectCustomer(suggestions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Handle Delete Customer
  const handleDelete = async (e, customerId, customerName) => {
    e.stopPropagation(); // Stop selection trigger
    if (
      window.confirm(
        `Yakin ingin menghapus pelanggan "${customerName}" dari database?`,
      )
    ) {
      const res = await deleteCustomer(customerId);
      if (res.success) {
        // Remove from suggestions locally immediately for UX
        setSuggestions((prev) => prev.filter((c) => c.id !== customerId));
        setSelectedIndex(-1); // Reset selection after delete
      } else {
        alert("Gagal menghapus: " + res.error);
      }
    }
  };

  return (
    <div style={{ padding: "0 12px" }} ref={wrapperRef}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: "8px",
        }}
      >
        {/* INPUT NAMA */}
        <div style={{ position: "relative" }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Nama Pelanggan / No HP..."
            value={customerSnapshot.name || ""}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            disabled={isLocked}
            style={{
              width: "100%",
              padding: "10px",
              background: "#0f172a",
              border: "3px solid #06b6d4",
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "bold",
              boxShadow:
                "0 0 20px rgba(6, 182, 212, 0.4), inset 0 0 10px rgba(6, 182, 212, 0.1)",
              transition: "all 0.3s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow =
                "0 0 30px rgba(6, 182, 212, 0.7), 0 0 60px rgba(6, 182, 212, 0.3), inset 0 0 20px rgba(6, 182, 212, 0.2)";
              e.currentTarget.style.borderColor = "#22d3ee";
              if ((customerSnapshot.name || "").length > 1) {
                setShowSuggestions(true);
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow =
                "0 0 20px rgba(6, 182, 212, 0.4), inset 0 0 10px rgba(6, 182, 212, 0.1)";
              e.currentTarget.style.borderColor = "#06b6d4";
              // Delay hiding so clik on delete isn't missed ? handled by click outside ref
            }}
          />
          {/* DROPDOWN SARAN */}
          {showSuggestions && suggestions.length > 0 && !isLocked && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "8px",
                marginTop: "4px",
                zIndex: 50,
                maxHeight: "300px", // Increased height
                overflowY: "auto",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
              }}
            >
              {suggestions.map((c, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      borderBottom: "1px solid #1e293b",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: isSelected ? "#1e293b" : "transparent", // Highlight Logic
                    }}
                    onMouseEnter={() => setSelectedIndex(index)} // Sync mouse hover with keyboard index
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          color: isSelected ? "#22d3ee" : "#fff", // Highlight text color
                          fontWeight: "500",
                        }}
                      >
                        {c.name}
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "11px" }}>
                        {c.phone || "-"}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#38bdf8",
                          background: "rgba(56, 189, 248, 0.1)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        LAMA
                      </div>
                      {/* DELETE BUTTON */}
                      <button
                        onClick={(e) => handleDelete(e, c.id, c.name)}
                        style={{
                          background: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          borderRadius: "4px",
                          padding: "4px",
                          cursor: "pointer",
                          color: "#ef4444",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Hapus Pelanggan"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* INPUT NO HP */}
        <input
          type="text"
          placeholder="No. HP (Opsional)"
          value={customerSnapshot.phone || ""}
          onChange={(e) => updateCustomerSnapshot({ phone: e.target.value })}
          disabled={isLocked}
          style={{
            padding: "10px",
            background: "#0f172a",
            border: "3px solid #06b6d4",
            borderRadius: "8px",
            color: "#ffffff",
            fontSize: "14px",
            boxShadow:
              "0 0 20px rgba(6, 182, 212, 0.4), inset 0 0 10px rgba(6, 182, 212, 0.1)",
            transition: "all 0.3s ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow =
              "0 0 30px rgba(6, 182, 212, 0.7), 0 0 60px rgba(6, 182, 212, 0.3), inset 0 0 20px rgba(6, 182, 212, 0.2)";
            e.currentTarget.style.borderColor = "#22d3ee";
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow =
              "0 0 20px rgba(6, 182, 212, 0.4), inset 0 0 10px rgba(6, 182, 212, 0.1)";
            e.currentTarget.style.borderColor = "#06b6d4";
          }}
        />
      </div>
    </div>
  );
}
