import React, { useState, useEffect, useRef } from "react";
import { useCustomerStore } from "../../stores/useCustomerStore";

export function CustomerSelector({
  customerSnapshot,
  updateCustomerSnapshot,
  isLocked,
}) {
  const { customers, loadCustomers } = useCustomerStore();
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    loadCustomers();
  }, []);

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
            type="text"
            placeholder="Nama Pelanggan / No HP..."
            // PERBAIKAN DI SINI: Tambah || ""
            value={customerSnapshot.name || ""}
            onChange={handleNameChange}
            disabled={isLocked}
            onFocus={() =>
              (customerSnapshot.name || "").length > 1 &&
              setShowSuggestions(true)
            }
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
                maxHeight: "200px",
                overflowY: "auto",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
              }}
            >
              {suggestions.map((c) => (
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
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#1e293b")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div>
                    <div style={{ color: "#fff", fontWeight: "500" }}>
                      {c.name}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "11px" }}>
                      {c.phone || "-"}
                    </div>
                  </div>
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* INPUT NO HP */}
        <input
          type="text"
          placeholder="No. HP (Opsional)"
          // PERBAIKAN DI SINI: Tambah || ""
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
