export function ReceiptSection({ items, removeItem, totalAmount, activeItemId, onItemClick, onConfirmPayment, transactionStage }) {
  const formatRupiah = (n) => {
    return 'Rp ' + n.toLocaleString('id-ID');
  };

  // Determine button text based on stage
  const getButtonText = () => {
    if (!transactionStage) return 'SIMPAN & BAYAR'; // Fallback

    switch (transactionStage) {
      case 'CART':
        return 'Lanjut Pembayaran →';
      case 'AWAITING_PAYMENT':
        return 'PROSES PEMBAYARAN';
      case 'POST_PAYMENT':
        return null; // Hide button in post-payment stage
      default:
        return 'SIMPAN & BAYAR';
    }
  };

  const buttonText = getButtonText();

  return (
    <div className="receipt-section">
      <div className="receipt-header">
        <h2>NOTA PESANAN</h2>
        <div className="divider"></div>
      </div>

      <div className="receipt-items">
        {items.length === 0 && (
          <div className="empty-state" style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>
            Belum ada item
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className={`receipt-item-card ${activeItemId === item.id ? 'active' : ''}`}
            onClick={() => onItemClick(item.id)}
            style={{
              cursor: 'pointer',
              borderColor: activeItemId === item.id ? '#3b82f6' : '#e2e8f0',
              backgroundColor: activeItemId === item.id ? '#eff6ff' : 'white'
            }}
          >
            <div className="item-info">
              <div className="item-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="item-name" style={{ fontWeight: 600 }}>{item.productName}</div>
                <div className="item-qty-badge" style={{
                  background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px',
                  fontSize: '11px', fontWeight: 'bold', color: '#475569'
                }}>
                  x{item.qty}
                </div>
              </div>

              <div className="item-desc" style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {item.description}
              </div>

              {/* Finishings display */}
              {item.finishings && item.finishings.length > 0 && (
                <ul className="item-finishings" style={{ marginTop: '4px', paddingLeft: '14px', fontSize: '11px', color: '#059669' }}>
                  {item.finishings.map((f, idx) => (
                    <li key={idx} style={{ listStyleType: 'disc' }}>
                      {typeof f === 'string' ? f : f.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="item-meta">
              <div className="item-price">
                {formatRupiah(item.totalPrice)}
              </div>
              <button
                className="btn-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(item.id);
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="receipt-footer">
        <div className="total-section">
          <span>TOTAL</span>
          <span className="total-amount">{formatRupiah(totalAmount)}</span>
        </div>

        {/* Conditionally render button based on stage */}
        {buttonText && (
          <button
            className="btn-pay"
            onClick={onConfirmPayment}
            disabled={items.length === 0}
            style={{
              opacity: items.length === 0 ? 0.5 : 1,
              cursor: items.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}
