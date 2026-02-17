/**
 * ============================================
 * WEB ORDER BRIDGE - 8 ENGINE IMPLEMENTATION
 * ============================================
 *
 * Strictly aligned with src/hooks/transactionLogic.js
 * audit findings. No invented logic!
 *
 * Supported Engines (from audit):
 * 1. AREA       - (L×W×Price) + Finishing
 * 2. LINEAR     - (L×Price) + Finishing
 * 3. MATRIX     - Size+Material Lookup
 * 4. BOOKLET    - ((Paper+Print)×Sheets) + Finishing
 * 5. UNIT       - Price×Qty
 * 6. TIERED     - TierPrice(Qty)×Qty
 * 7. UNIT_SHEET - (Price+Cutting) + Finishing
 * 8. MANUAL     - InputPrice×Qty + Finishing
 */

import { supabase } from "../services/supabaseClient";

export class WebOrderBridge {
  /**
   * ============================================
   * MAIN TRANSFORMATION FUNCTION
   * ============================================
   */
  static async transformToPosItem(webOrder) {
    try {
      // 1. Fetch catalog data (Mapping + Config from View)
      const catalogData = await this.fetchCatalogData(webOrder.product_code);

      if (!catalogData) {
        throw new Error(
          `Product mapping not found: ${webOrder.product_code}. ` +
            `Please add to web_product_mapping table.`,
        );
      }

      // 2. Extract config from View data
      const formConfig = catalogData.form_config || {
        form_type: "UNIT",
        source: "FALLBACK_VIEW_NULL",
      };

      // 3. Derive Engine Mode (Smart Translation)
      const engineMode = this.deriveEngineMode(
        formConfig.form_type,
        formConfig.display_config,
      );

      // 4. Build specs based on Engine Mode
      const specs = this.buildSpecsByEngine(
        engineMode,
        webOrder.specs_snapshot,
        catalogData, // Pass full catalog data as mapping
        formConfig,
      );

      // 5. Lift finishing to root level
      const rootFinishings = this.liftFinishing(
        webOrder.specs_snapshot?.finishing || [],
      );

      // 5b. BRIDGE ADAPTATION: Sync for Receipt Compatibility (Reference Assignment)
      // The POS Core (NotaPreview) expects finishing in specs.finishing_list
      // We perform this assignment here to ensure Single Source of Truth
      specs.finishing_list = rootFinishings;

      // 6. Validate inputs
      this.validateSpecs(specs, catalogData);

      // 7. Build POS cart item
      return this.buildCartItem(
        webOrder,
        catalogData, // Pass full catalog data
        formConfig,
        engineMode,
        specs,
        rootFinishings,
      );
    } catch (error) {
      console.error("[WebOrderBridge] Transformation error:", error);
      throw error;
    }
  }

  /**
   * ============================================
   * UNIFIED CATALOG LOOKUP (VIEW + MASTER DATA)
   * Replaces fetchMapping + getFormConfig
   * ============================================
   */
  static async fetchCatalogData(webCode) {
    // 1. Fetch View Data
    const { data: viewData, error: viewError } = await supabase
      .from("web_product_catalog")
      .select("*")
      .eq("web_code", webCode)
      .single();

    if (viewError) {
      console.error("[fetchCatalogData] View Error:", viewError);
      return null;
    }

    // 2. Fetch Master Data from Products Table (Price, Variants)
    if (viewData?.pos_product_id) {
      const { data: productData } = await supabase
        .from("products")
        .select("base_price, variants, calc_engine, pricing_mode")
        .eq("id", viewData.pos_product_id)
        .single();

      if (productData) {
        // Merge Master Data (only existing columns)
        viewData.master_price = productData.base_price || 0;
        viewData.master_variants = productData.variants || [];
        viewData.calc_engine = productData.calc_engine;
        viewData.pricing_mode = productData.pricing_mode;
      }
    }

    return viewData;
  }

  // ... (deriveEngineMode, liftFinishing methods remain same) ...

  // To preserve file structure, I will not include the middle methods in ReplacementContent
  // effectively relying on the user to keep them or I must target specific blocks.
  // Since replace_file_content replaces a block, I must be careful.
  // I will target fetchCatalogData separately if possible, OR I will assume the user wants me to edit buildCartItem in a separate call?
  // No, I can do multiple edits if I use multi_replace. But I am using replace_file_content here.
  // I will target the `fetchCatalogData` method first.

  /**
   * ============================================
   * SMART TRANSLATION: FORM TYPE -> ENGINE MODE
   * ============================================
   */
  static deriveEngineMode(formType, displayConfig) {
    if (formType === "CALCULATOR") {
      return displayConfig?.fixed_width === true ? "LINEAR" : "AREA";
    }
    if (formType === "UNIT") {
      return displayConfig?.show_price_tiers === true ? "TIERED" : "UNIT";
    }
    if (formType === "MATRIX") {
      return "MATRIX";
    }
    return "UNIT"; // Fallback
  }

  /**
   * ============================================
   * FINISHING NORMALIZER (LIFT TO ROOT)
   * ============================================
   */
  static liftFinishing(rawFinishing) {
    if (!rawFinishing || !Array.isArray(rawFinishing)) {
      return [];
    }

    return rawFinishing
      .map((item) => {
        // Object with ID
        if (typeof item === "object" && item.id) {
          return {
            id: item.id,
            name: item.label || item.name || item.id,
            price: item.price || 0,
            price_mode: item.price_mode || "PER_UNIT",
          };
        }

        // String ID only
        if (typeof item === "string") {
          return {
            id: item,
            name: item,
            price: 0,
            price_mode: "PER_UNIT",
          };
        }

        return null;
      })
      .filter(Boolean);
  }

  /**
   * ============================================
   * FETCH MAPPING FROM DATABASE
   * ============================================
   */
  /**
   * ============================================
   * FETCH MAPPING FROM DATABASE (Deprecated)
   * Replaced by fetchCatalogData
   * ============================================
   */
  static async fetchMapping(webCode) {
    // Legacy support wrapper
    return this.fetchCatalogData(webCode);
  }

  static buildSpecsByEngine(engineMode, inputs, mapping, formConfig) {
    switch (engineMode) {
      // ==========================================
      // ENGINE 1: AREA
      // Calculation: (Length × Width × Price) + Finishing
      // Used by: Spanduk, Banner Outdoor
      // ==========================================
      case "AREA": {
        const length = parseFloat(inputs.length) || 0;
        const width = parseFloat(inputs.width) || 0;
        const area = length * width;
        const material =
          inputs.material || mapping.input_options?.material?.[0]?.value;
        const finishing = inputs.finishing || [];

        return {
          type: "AREA",
          inputs: {
            length,
            width,
            area,
            material,
            finishing,
          },
          summary: `${length}m × ${width}m (${area.toFixed(2)}m²) • ${
            material || "Material TBD"
          }`,
        };
      }

      // ==========================================
      // ENGINE 2: LINEAR
      // Calculation: (Length × Price/meter) + Finishing
      // Used by: Stiker Roll, Vinyl Meteran
      // Note: Width is FIXED (e.g., 1.2m for rolls)
      // ==========================================
      case "LINEAR": {
        const length = parseFloat(inputs.length) || 0;
        const width = 1.2; // Fixed width for rolls (from audit)
        const material =
          inputs.material || mapping.input_options?.material?.[0]?.value;
        const finishing = inputs.finishing || [];

        return {
          type: "LINEAR",
          inputs: {
            length,
            width, // Fixed width
            material,
            finishing,
          },
          summary: `${length}m • ${material || "Material TBD"} • Lebar ${width}m`,
        };
      }

      // ==========================================
      // ENGINE 3: MATRIX
      // Calculation: Lookup[Size][Material] from price matrix
      // Used by: Poster, Kartu Nama
      // ==========================================
      case "MATRIX": {
        const size = inputs.size || mapping.input_options?.size?.[0]?.value;
        const material =
          inputs.material || mapping.input_options?.material?.[0]?.value;
        const qty = parseInt(inputs.qty) || 1;
        const finishing = inputs.finishing || [];

        return {
          type: "MATRIX",
          inputs: {
            size,
            material,
            qty,
            finishing,
          },
          summary: `${size || "Size TBD"} • ${material || "Material TBD"}${
            qty > 1 ? ` × ${qty}` : ""
          }`,
        };
      }

      // ==========================================
      // ENGINE 4: BOOKLET
      // Calculation: ((Paper_Price + Print_Price) × Sheets) + Finishing
      // Used by: Buku Yasin, Majalah, Buku Kenangan
      // CRITICAL: Capture sheets, paper_type, print_mode
      // ==========================================
      case "BOOKLET": {
        const sheets = parseInt(inputs.sheets) || 0;
        const paperType =
          inputs.paper_type || mapping.input_options?.paper_type?.[0]?.value;
        const printMode =
          inputs.print_mode || mapping.input_options?.print_mode?.[0]?.value;
        const qtyBooks = parseInt(inputs.qty_books || inputs.qty) || 1;
        const finishing = inputs.finishing || [];

        return {
          type: "BOOKLET",
          inputs: {
            sheets,
            paper_type: paperType,
            print_mode: printMode,
            qty_books: qtyBooks,
            finishing,
          },
          summary: `${sheets} halaman • ${paperType} • ${printMode} • ${qtyBooks} buku`,
        };
      }

      // ==========================================
      // ENGINE 5: UNIT
      // Calculation: Price × Qty (Simple)
      // Used by: Merchandise (Mug, Tumbler, Kaos)
      // ==========================================
      case "UNIT": {
        const variant =
          inputs.variant || mapping.input_options?.variant?.[0]?.value;
        const qty = parseInt(inputs.qty) || 1;

        return {
          type: "UNIT",
          inputs: {
            variant,
            qty,
          },
          summary: `${variant}${qty > 1 ? ` × ${qty} pcs` : ""}`,
        };
      }

      // ==========================================
      // ENGINE 6: TIERED
      // Calculation: TierPrice(Qty) × Qty
      // Used by: Brosur (qty-based pricing tiers)
      // Backend must lookup tier based on qty
      // ==========================================
      case "TIERED": {
        const qty = parseInt(inputs.qty) || 0;
        const variant = inputs.paper_type || inputs.variant;

        return {
          type: "TIERED",
          inputs: {
            qty,
            variant,
          },
          summary: `${qty} pcs${variant ? ` • ${variant}` : ""}`,
        };
      }

      // ==========================================
      // ENGINE 7: UNIT_SHEET
      // Calculation: (Base_Price + Cutting_Cost) + Finishing
      // Used by: Stiker A3, Digital Print per lembar
      // CRITICAL: Capture cutting_type details
      // ==========================================
      case "UNIT_SHEET": {
        const sheetSize =
          inputs.sheet_size || mapping.input_options?.sheet_size?.[0]?.value;
        const qty = parseInt(inputs.qty) || 1;
        const cuttingType = inputs.cutting_type || "KISS_CUT";
        const cuttingCost = parseFloat(inputs.cutting_cost) || 0;
        const finishing = inputs.finishing || [];

        return {
          type: "UNIT_SHEET",
          inputs: {
            sheet_size: sheetSize,
            qty,
            cutting_type: cuttingType,
            cutting_cost: cuttingCost,
            finishing,
          },
          summary: `${qty} lembar ${sheetSize} • ${cuttingType}`,
        };
      }

      // ==========================================
      // ENGINE 8: MANUAL
      // Calculation: Input_Price × Qty + Finishing
      // Used by: Custom Jobs, Jasa Desain
      // ==========================================
      case "MANUAL": {
        const description = inputs.description || mapping.web_display_name;
        const qty = parseInt(inputs.qty) || 1;
        const manualPrice = parseFloat(inputs.manual_price) || 0;
        const finishing = inputs.finishing || [];

        return {
          type: "MANUAL",
          inputs: {
            description,
            qty,
            manual_price: manualPrice,
            finishing,
          },
          summary: description,
        };
      }

      // ==========================================
      // DEFAULT: Unknown engine type
      // ==========================================
      default:
        throw new Error(
          `Unknown engine mode: ${engineMode}. ` +
            `Check deriveEngineMode() logic.`,
        );
    }
  }

  /**
   * ============================================
   * VALIDATE SPECS AGAINST MAPPING RULES
   * ============================================
   */
  static validateSpecs(specs, mapping) {
    const rules = mapping.validation_rules || {};
    const inputs = specs.inputs;

    // Check required fields
    const requiredFields = mapping.required_inputs || [];
    for (const field of requiredFields) {
      if (
        inputs[field] === undefined ||
        inputs[field] === null ||
        inputs[field] === ""
      ) {
        throw new Error(`Required field missing: ${field}`);
      }
    }

    // Validate numeric constraints
    for (const [field, constraint] of Object.entries(rules)) {
      const value = parseFloat(inputs[field]);

      if (isNaN(value)) continue;

      if (constraint.min !== undefined && value < constraint.min) {
        throw new Error(
          `${field} below minimum: ${constraint.min}${constraint.unit ? " " + constraint.unit : ""}`,
        );
      }

      if (constraint.max !== undefined && value > constraint.max) {
        throw new Error(
          `${field} exceeds maximum: ${constraint.max}${constraint.unit ? " " + constraint.unit : ""}`,
        );
      }
    }

    return true;
  }

  /**
   * ============================================
   * BUILD FINAL POS CART ITEM
   * ============================================
   */
  static buildCartItem(
    webOrder,
    mapping,
    formConfig,
    engineMode,
    specs,
    rootFinishings,
  ) {
    // ── IDENTIFICATION ──────────────────────────
    // 1. Pass validation (requires product.id)
    // 2. Let POS Core calculate prices (no manual calculation)

    return {
      // ── IDENTIFICATION ──────────────────────────
      id: `web_${webOrder.id}`,
      product_id: mapping.pos_product_id,
      productId: mapping.pos_product_id, // Legacy alias
      categoryId: mapping.pos_category,

      // ── DISPLAY ─────────────────────────────────
      name: mapping.web_display_name,
      productName: mapping.web_display_name,
      description: mapping.web_description || mapping.web_display_name,

      // ── PRICING TYPE (GUARANTEED) ────────────────
      pricingType: engineMode,

      // ── PRODUCT NESTED (for useOrderStore) ───────
      product: {
        id: mapping.pos_product_id,
        name: mapping.web_display_name,
        price: mapping.master_price || 0,
        pricing_type: engineMode,
        category_id: mapping.pos_category,
        calc_engine: mapping.calc_engine,
        // Inject Master Data for Calculator
        variants: mapping.master_variants || [],
      },

      // ── QUANTITY ─────────────────────────────────
      qty: specs.inputs.qty || specs.inputs.qty_books || 1,

      // ── PRICING (Let POS calculate) ──────────────
      unitPrice: 0,
      totalPrice: 0,
      price: 0,

      // ── SPECS (Bridge contract) ───────────────────
      specs: specs, // 🔥 TRUSTED SOURCE (Metadata rich)
      dimensions: specs.inputs || {}, // 🔥 UNWRAP: Flatten for POS Calculator (Safety Fix)

      // ── FINISHINGS AT ROOT (for useOrderStore) ────
      finishings: rootFinishings,

      // ── FINANCIALS (Trigger POS recalculation)
      finalTotal: 0,
      pricingSnapshot: {
        breakdown: "Web Order (POS will recalculate)",
        price: 0,
        webEstimate: webOrder.quoted_amount || 0,
        configSource: formConfig.source, // PRODUCT_OVERRIDE/CATEGORY/FALLBACK
      },

      // ── METADATA & DEBUG
      notes: webOrder.notes_customer || `Web Order`,
      webOrderId: webOrder.id,
      selected_details: {
        variant: specs.summary,
        notes: webOrder.notes_customer,
      },

      // Debug only
      _bridge_version: "3.0 (Smart Translation)",
      _webCode: webOrder.product_code,
    };
  }
}

/**
 * ============================================
 * HELPER FUNCTIONS FOR WEB LANDING
 * ============================================
 */

/**
 * Get product config for dynamic form building
 */
/**
 * Get product config for dynamic form building
 * Now uses the VIEW to get both mapping and config in one shot
 */
export async function getWebProductConfig(webCode) {
  return WebOrderBridge.fetchCatalogData(webCode);
}

/**
 * Get all active products for catalog
 * Now selects ALL columns including form_config to enable dynamic frontend
 */
export async function getWebProductCatalog() {
  const { data, error } = await supabase
    .from("web_product_catalog")
    .select("*")
    .eq("is_active", true)
    .order("display_order, web_display_name");

  if (error) {
    console.error("[getWebProductCatalog] Error:", error);
    return [];
  }

  return data;
}

/**
 * Get products grouped by category
 */
export async function getWebProductsByCategory() {
  const catalog = await getWebProductCatalog();

  if (!catalog || catalog.length === 0) return {};

  // Group by category
  const grouped = {};
  for (const product of catalog) {
    const cat = product.pos_category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(product);
  }

  return grouped;
}
