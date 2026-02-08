// Simulation Script: Router Logic V2 (Dry Run)
// Simulates the SQL generation for the proposed "Universal Router"

const SIMULATION_CASES = [
  {
    id: "TEST_CASE_A",
    name: "THE SPANDUK",
    context: {
      id: "PROD_SPANDUK",
      calc_engine: "LINEAR_METER", // or AREA
      pricing_mode: "LINEAR",
    },
    payload: {
      id: "PROD_SPANDUK",
      price: 18000,
      variants: [
        { id: "MAT_FLEXI_280", price: 18000 }, // Frontend sends this
      ],
    },
  },
  {
    id: "TEST_CASE_B",
    name: "THE KARTU NAMA",
    context: {
      id: "PROD_KARTUNAMA",
      calc_engine: "MATRIX_FIXED",
      pricing_mode: "MATRIX",
    },
    payload: {
      id: "PROD_KARTUNAMA",
      variants: [
        {
          id: "MAT_KARTUNAMA_STD",
          price_list: {
            BOX_1: 45000,
            BOX_5: 200000,
          },
        },
      ],
    },
  },
];

function simulateRouter(testCase) {
  console.log(`\n🧪 RUNNING: ${testCase.name} (${testCase.id})`);
  console.log(`Context: calc_engine=${testCase.context.calc_engine}`);

  let generatedSQL = [];
  let logicPath = "UNKNOWN";

  // --- ROUTER LOGIC SIMULATION ---

  // PATH 1: LINEAR / AREA (Spanduk)
  if (
    ["LINEAR_METER", "AREA_METER", "LINEAR", "AREA"].includes(
      testCase.context.calc_engine,
    )
  ) {
    logicPath = "PATH_LINEAR_AREA";
    console.log("➡️ ROUTER DECISION: Route to 'product_materials'");

    const variants = testCase.payload.variants;
    if (variants && variants.length > 0) {
      variants.forEach((variant) => {
        // LOCK STRATEGY CHECK:
        // Are we updating by Product ID or Material ID?
        // The frontend sends Variant ID which IS the Material ID in this architecture.

        // OPTION A: Update by Product Link (Risk: Many-to-Many conflict?)
        // SQL: UPDATE product_materials SET price_per_unit = ... WHERE product_id = ...

        // OPTION B: Update by Material ID (Direct Inventory Update)
        // SQL: UPDATE product_materials SET price_per_unit = ... WHERE id = ...

        // SIMULATING OPTION B (Safer for 7 Pillars)
        const sql = `UPDATE product_materials SET price_per_unit = ${variant.price} WHERE id = '${variant.id}';`;
        generatedSQL.push(sql);
      });
    }
  }
  // PATH 2: MATRIX (Kartu Nama)
  else if (["MATRIX", "MATRIX_FIXED"].includes(testCase.context.calc_engine)) {
    logicPath = "PATH_MATRIX";
    console.log("➡️ ROUTER DECISION: Route to 'product_price_matrix'");

    const variants = testCase.payload.variants;
    if (variants && variants.length > 0) {
      variants.forEach((variant) => {
        if (variant.price_list) {
          Object.entries(variant.price_list).forEach(([sizeId, price]) => {
            // UPSERT Logic
            const sql = `INSERT INTO product_price_matrix (product_id, material_id, size_id, price) VALUES ('${testCase.payload.id}', '${variant.id}', '${sizeId}', ${price}) ON CONFLICT (product_id, material_id, size_id) DO UPDATE SET price = EXCLUDED.price;`;
            generatedSQL.push(sql);
          });
        }
      });
    }
  }

  // --- OUTPUT ---
  console.log(`🛤️ LOGIC PATH: ${logicPath}`);
  console.log("📜 GENERATED SQL:");
  generatedSQL.forEach((sql) => console.log(`   ${sql}`));

  return generatedSQL;
}

// EXECUTE
SIMULATION_CASES.forEach((tc) => simulateRouter(tc));
