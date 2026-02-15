# Known Issues & Technical Debt

## High Priority (Fix in Week 2-4)

1. **Database Constraints**
   - Issue: Critical fields nullable (total_amount, quantity, etc.)
   - Impact: Risk of NULL data corruption
   - Fix: Add NOT NULL constraints after data cleanup
   - ETA: Week 2

## Medium Priority (Fix in Month 2-3)

1. **Bundle Size**
   - Issue: Main bundle 1.2 MB (347 KB gzipped)
   - Impact: Slower initial load on slow connections
   - Fix: Code splitting, lazy loading
   - ETA: Month 2

## Low Priority (Future Enhancement)

1. **Product Edit Tracking**
   - Test 4 skipped (not critical for launch)
   - Fix: Add audit log for price changes
   - ETA: TBD

## Monitoring Alerts

- Database size > 400 MB: Consider cleanup
- API requests > 400k/month: Review optimization
- Order count > 8,000: Review retention policy
