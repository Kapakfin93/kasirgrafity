import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { seedPilotProduct, verifyPilotProduct } from './data/seeders/pilotSeeder.js'
import { runMigration } from './data/seeders/migrationSeeder.js'
import { runSurgicalFix } from './data/seeders/surgicalFix.js'
import { runLargeFormatReconstruction } from './data/seeders/reconstructLargeFormat.js'
import { runOfficeReconstruction } from './data/seeders/reconstructOffice.js'
import { runMerchReconstruction } from './data/seeders/reconstructMerchandise.js'
import { runA3Reconstruction } from './data/seeders/reconstructDigitalA3.js'
import { runCustomReconstruction } from './data/seeders/reconstructCustom.js'

// GEN 2 INITIALIZATION SEQUENCE
// 1. Seed pilot product - DISABLED (replaced by master products)
// 2. Run migration (consolidate categories, archive old products)
// 3. Run surgical fix (restore missing, move misplaced, assign input_mode)
// 4. Run LARGE_FORMAT reconstruction (4 master products)
// 5. Run STATIONERY_OFFICE reconstruction (6 master products)

// PILOT SEEDER DISABLED - Prevents zombie product recreation
// Master products are now seeded via reconstruction scripts
// seedPilotProduct().then(() => {
//   verifyPilotProduct();

// Run migration (this creates 4 new pillar categories)
setTimeout(() => {
  runMigration().then(() => {
    // Run surgical fix after migration completes
    setTimeout(() => {
      runSurgicalFix().then(() => {
        // Run LARGE_FORMAT reconstruction after surgical fix
        setTimeout(() => {
          runLargeFormatReconstruction().then(() => {
            // Run STATIONERY_OFFICE reconstruction after LARGE_FORMAT
            setTimeout(() => {
              runOfficeReconstruction().then(() => {
                // Run MERCHANDISE reconstruction after OFFICE
                setTimeout(() => {
                  runMerchReconstruction().then(() => {
                    // Run DIGITAL_A3_PRO reconstruction after MERCH
                    setTimeout(() => {
                      runA3Reconstruction().then(() => {
                        // Run CUSTOM_SERVICES reconstruction after A3
                        setTimeout(() => {
                          runCustomReconstruction();
                        }, 500);
                      });
                    }, 500);
                  });
                }, 500);
              });
            }, 500);
          });
        }, 500);
      });
    }, 500);
  });
}, 500);
// });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
