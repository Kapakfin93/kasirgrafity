# CALCULATION ENGINE AUDIT REPORT

**Date:** 2026-02-16
**Source Files:** `src/hooks/transactionLogic.js` & `src/core/calculators.js`

## Finite Set of Calculation Models

| LOGIC CODE     | INPUTS USED                          | DESCRIPTION                                 | EXAMPLE PRODUCTS        |
| :------------- | :----------------------------------- | :------------------------------------------ | :---------------------- |
| **AREA**       | `L`, `W`, `Price`, `Qty`             | `Math.ceil(Area) * Price * Qty` + Finishing | Spanduk (Outdoor)       |
| **LINEAR**     | `L`, `Price`, `Qty`                  | `L * Price * Qty` + Finishing               | Stiker Meteran (Rolls)  |
| **MATRIX**     | `SizeKey`, `MaterialKey`             | Lookup `Price[Size][Mat]` \* Qty            | Poster, Kartu Nama      |
| **BOOKLET**    | `Sheets`, `PaperPrice`, `PrintPrice` | `((Paper + Print) * Sheets + Fin) * Qty`    | Buku Kenangan, Majalah  |
| **UNIT**       | `VariantPrice`                       | `(Price + Fin) * Qty`                       | Merchandise, Tumbler    |
| **TIERED**     | `Qty`                                | `TierPrice(Qty) * Qty` + Finishing          | Brosur (Qty dependent)  |
| **UNIT_SHEET** | `CuttingCost`, `Finishing`           | `(Print + Cut + Fin) * Qty`                 | Stiker A3+ (Lembaran)   |
| **MANUAL**     | `ManualInput`                        | `(ManualPrice + Fin) * Qty`                 | Jasa Desain, Custom Job |

## Specific Logic Checks

1.  **Books/Booklets Logic?**
    - **YES FOUND:** `case "BOOKLET"` in `transactionLogic.js` (Line 151).
    - **Logic:** Calculations rely on `sheetsPerBook`, `variantLabel` (Paper), and `printModeId` (Print Cost).
    - **Loop:** Finishing calculation handles `PER_JOB` vs `PER_UNIT` logic specifically for booklets.

2.  **Sheets + Cutting Logic?**
    - **YES FOUND:** `case "UNIT_SHEET"` in `transactionLogic.js` (Line 210) & `calculators.js` (Line 52).
    - **Formula:** `(Price + CuttingCost + FinishingCost) * Qty`.
    - **Note:** Cutting cost is passed as part of `dimensions` object (`dimensions.cuttingCost`).

3.  **Tiered Pricing Logic?**
    - **YES FOUND:** `getTieredPrice` helper in `transactionLogic.js` (Line 24).
    - **Integration:** It intercepts the `UNIT` and `TIERED` cases.
    - **Rule:** Looks up `product.advanced_features.wholesale_rules` based on `qty` range.
