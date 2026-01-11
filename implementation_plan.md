# Standardizing Cart & Implementing Payment Settlement

Standardize the item structure between custom and legacy configurators to fix display issues (`RpNaN` and missing descriptions) and implement the final payment settlement flow.

## User Review Required

> [!IMPORTANT]
> The "SIMPAN & BAYAR" button will now actually save orders to the database (IndexedDB) and clear the cart.

## Proposed Changes

### [useTransaction.js](file:///c:/Users/Administrator/Downloads/kasirgrafity/src/hooks/useTransaction.js)

#### [MODIFY] [Standardize addItemToCart (Rule #2)](file:///c:/Users/Administrator/Downloads/kasirgrafity/src/hooks/useTransaction.js)
- Map all product types to a single contract: `{ id, name, description, pricingType, qty, dimensions, finishings, unitPrice, totalPrice }`.
- Ensure mapping happens **before** entering `tempItems`.

#### [MODIFY] [Fail-safe Calculation (Rule #3)](file:///c:/Users/Administrator/Downloads/kasirgrafity/src/hooks/useTransaction.js)
- Update `_calculateCurrentPrice` to return `0` instead of `NaN` for incomplete inputs.

#### [MODIFY] [finalizeOrder (Rule #1)](file:///c:/Users/Administrator/Downloads/kasirgrafity/src/hooks/useTransaction.js)
- Implement `finalizeOrder` which calls `useOrderStore.createOrder()`. 
- **NO DIRECT DATABASE WRITING** in this hook.

---

### [ReceiptSection.jsx](file:///c:/Users/Administrator/Downloads/kasirgrafity/src/components/ReceiptSection.jsx)

#### [MODIFY] [Generic Item Render](file:///c:/Users/Administrator/Downloads/kasirgrafity/src/components/ReceiptSection.jsx)
- Use the standardized item fields (`name`, `description`, `totalPrice`) for rendering to remove logic in UI.

#### [MODIFY] [Trigger Payment Flow](file:///c:/Users/Administrator/Downloads/kasirgrafity/src/components/ReceiptSection.jsx)
- Update "SIMPAN & BAYAR" to trigger `onConfirmPayment` in Workspace.

---

### [Workspace.jsx](file:///c:/Users/Administrator/Downloads/kasirgrafity/src/modules/pos/Workspace.jsx)

#### [MODIFY] [Orchestrate Flow (Rule #3)](file:///c:/Users/Administrator/Downloads/kasirgrafity/src/modules/pos/Workspace.jsx)
- Implement `handleConfirmPayment` following the flow: `finalizeOrder` -> `createOrder` -> `reset workspace`.

## Verification Plan

### Automated Tests
- Browser test: Add Poster, Add A3+, verify cart contents show correct prices and descriptions.
- Browser test: Click "SIMPAN & BAYAR", verify order appears in "Order" board and cart is cleared.

### Manual Verification
- **Test Item Setengah Jadi:** Tambah Banner tanpa ukuran -> Harus tertahan validasi.
- **Test Reset Pasca-Bayar:** Setelah sukses bayar, pastikan cart, total, dan state finishing benar-benar bersih (0 residue).
- **Flow Kasir:** Pilih Kategori -> Konfigurasi -> Tambah -> Cek Item & Deskripsi -> Bayar -> Sukses.
