import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env manually to ensure it works without external deps
const envPath = path.resolve(process.cwd(), ".env");
const envConfig = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      envConfig[key.trim()] = value.trim();
    }
  });
}

const supabaseUrl =
  envConfig.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  envConfig.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const manifest = [
  { web_code: "SPANDUK_FLEXI", logic_type: "CALCULATOR" },
  { web_code: "STIKER_METERAN", logic_type: "CALCULATOR" }, // Note: Might show as LINEAR in engineMode derivation due to fixed_width logic
  { web_code: "CETAK_KAIN_TC", logic_type: "CALCULATOR" },
  { web_code: "DTF_METERAN", logic_type: "CALCULATOR" },
  { web_code: "DISPLAY_STAND", logic_type: "UNIT" },

  { web_code: "NOTA_1PLY", logic_type: "MATRIX" },
  { web_code: "NOTA_2PLY", logic_type: "MATRIX" },
  { web_code: "KARTU_NAMA", logic_type: "MATRIX" },

  { web_code: "STIKER_A3", logic_type: "MATRIX" },
  { web_code: "PRINT_A3_POD", logic_type: "MATRIX" },
  { web_code: "POSTER_INDOOR", logic_type: "MATRIX" },

  { web_code: "KAOS_DTF", logic_type: "UNIT" },
  { web_code: "JERSEY_PRINT", logic_type: "UNIT" },
  { web_code: "JASA_DESAIN", logic_type: "UNIT" },
];

async function verify() {
  console.log(
    "🔍 Verifying Frontend Manifest against web_product_catalog view...",
  );

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const item of manifest) {
    const { data, error } = await supabase
      .from("web_product_catalog")
      .select("web_code, form_config")
      .eq("web_code", item.web_code)
      .single();

    if (error) {
      console.error(`❌ ${item.web_code}: NOT FOUND in View`);
      results.push({
        code: item.web_code,
        status: "MISSING",
        expected: item.logic_type,
      });
      failCount++;
      continue;
    }

    const formType = data.form_config?.form_type || "UNKNOWN";
    const displayConfig = data.form_config?.display_config || {};

    // Logic Translation (mimic deriveEngineMode roughly or just check form_type)
    // The manifest says "CALCULATOR", DB says "CALCULATOR".
    // "LINEAR" is a derived mode in FE, but DB stores "CALCULATOR" + fixed_width.
    // So we check form_type.

    const match = formType === item.logic_type;

    if (match) {
      console.log(`✅ ${item.web_code}: MATCH (${formType})`);
      successCount++;
    } else {
      console.error(
        `❌ ${item.web_code}: MISMATCH. Expected ${item.logic_type}, Got ${formType}`,
      );
      failCount++;
    }

    results.push({
      code: item.web_code,
      status: match ? "OK" : "MISMATCH",
      expected: item.logic_type,
      actual: formType,
    });
  }

  console.log("\n📊 VERIFICATION SUMMARY");
  console.log(`Total: ${manifest.length}`);
  console.log(`Passed: ${successCount}`);
  console.log(`Failed: ${failCount}`);

  if (failCount === 0) {
    console.log("\n🚀 MANIFEST VERIFIED! Frontend logic is synchronized.");
  } else {
    console.log("\n⚠️ DISCREPANCIES FOUND. Please investigate.");
  }
}

verify();
