import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { seedPilotProduct, verifyPilotProduct } from './data/seeders/pilotSeeder.js'
import { runMigration } from './data/seeders/migrationSeeder.js'
import { runSurgicalFix } from './data/seeders/surgicalFix.js'
import { runLargeFormatReconstruction } from './data/seeders/reconstructLargeFormat.js'

// GEN 2 INITIALIZATION SEQUENCE
// 1. Seed pilot product - DISABLED (replaced by master products)
// 2. Run migration (consolidate categories, archive old products)
// 3. Run surgical fix (restore missing, move misplaced, assign input_mode)
// 4. Run LARGE_FORMAT reconstruction (replace with 4 master products)

// PILOT SEEDER DISABLED - Prevents zombie product recreation
// Master products are now seeded via runLargeFormatReconstruction()
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
          runLargeFormatReconstruction();
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
