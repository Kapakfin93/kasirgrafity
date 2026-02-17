import { useState, useEffect } from "react";
import {
  WebOrderBridge,
  getWebProductConfig,
} from "../services/WebOrderBridge";

/**
 * Hook to bridge Web Frontend with POS Logic
 * Fetches configuration from web_product_catalog and derives the calculation engine.
 */
export function useOrderBridge(webCode) {
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [engineMode, setEngineMode] = useState("UNIT");

  useEffect(() => {
    if (!webCode) {
      setLoading(false);
      return;
    }

    const loadConfig = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getWebProductConfig(webCode);

        if (!data) {
          throw new Error(`Product code '${webCode}' not found in catalog.`);
        }

        setProductData(data);

        // Derive Engine Mode using the Bridge service logic
        // We use the form_config directly from the view
        const formConfig = data.form_config || {};
        const mode = WebOrderBridge.deriveEngineMode(
          formConfig.form_type,
          formConfig.display_config,
        );
        setEngineMode(mode);
        console.log(`[useOrderBridge] Loaded ${webCode} -> Mode: ${mode}`);
      } catch (err) {
        console.error("[useOrderBridge] Error:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [webCode]);

  return { productData, loading, error, engineMode };
}
