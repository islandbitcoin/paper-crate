# Testing Payment Flow End-to-End

## Prerequisites
1. **WebLN Browser Extension**: Install Alby or another WebLN-compatible wallet extension
2. **Lightning Wallet**: Ensure your WebLN wallet has some sats for testing
3. **Two Test Accounts**: One business account and one creator account

## Testing Steps

### 1. Setup Creator Account
1. Log in as a creator
2. Go to Profile → Edit Profile
3. Add a Lightning address (e.g., `your-name@getalby.com`)
4. Save the profile

### 2. Create a Campaign (Business Account)
1. Log in as a business
2. Click "Create Campaign"
3. Fill in campaign details with a test budget (e.g., 1000 sats)
4. Select at least one platform
5. Create the campaign

### 3. Apply to Campaign (Creator Account)
1. Switch to creator account
2. Find the campaign in "Discover Campaigns"
3. Click "Apply to Campaign"
4. The form should auto-fill from your social profiles
5. Submit application

### 4. Approve Application (Business Account)
1. Switch to business account
2. Go to Dashboard → Applications tab
3. Find the pending application
4. Click "Approve" button
5. Verify status changes to "approved"

### 5. Submit Performance Report (Creator Account)
1. Switch to creator account
2. Go to Dashboard → My Applications
3. Find the approved application
4. Click "Submit Report"
5. Fill in:
   - Post URL (can be any URL for testing)
   - Metrics (e.g., Views: 100, Likes: 10)
   - Amount to claim (e.g., 500 sats)
   - Optional notes
6. Submit the report

### 6. Verify Report (Business Account)
1. Switch to business account
2. Go to Dashboard → Reports & Payments tab
3. Find the report under "Pending Verification"
4. Review the metrics and post URL
5. Click "Approve Report"
6. Report should move to "Ready for Payment" section

### 7. Make Payment (Business Account)
1. In the "Ready for Payment" section
2. Click "Pay Creator" button
3. In the payment dialog:
   - Verify creator info and amount
   - Click "Request Invoice"
   - Select payment method (WebLN recommended)
   - Click "Send Payment"
4. Your WebLN wallet should prompt for payment approval
5. Approve the payment in your wallet

### 8. Verify Payment Completion
1. Payment dialog should show success message
2. Report should move to "Paid" section
3. Payment hash should be visible on the report
4. Campaign spent amount should increase

## Common Issues and Solutions

### WebLN Not Detected
- Ensure your wallet extension is installed and unlocked
- Refresh the page after installing the extension
- Try enabling the extension on the site

### Invoice Request Fails
- Check creator's Lightning address is valid
- Ensure the Lightning address service is online
- Try with a different Lightning address

### Payment Fails
- Ensure sufficient balance in wallet
- Check wallet is connected and unlocked
- Try switching payment method to NWC if WebLN fails

### Report Stays Pending After Approval
- Wait 10 seconds for the UI to update
- Refresh the page
- Check browser console for errors

## Testing Different Scenarios

### Test Multiple Payments
1. Create multiple reports from different creators
2. Approve and pay them in sequence
3. Verify campaign budget tracking

### Test Payment Methods
1. Test with WebLN (browser extension)
2. Test with NWC (requires NWC connection string)
3. Compare user experience

### Test Edge Cases
1. Try to pay without approving first
2. Try to pay twice for same report
3. Test with very small amounts (1 sat)
4. Test with larger amounts

## Debugging

### Check Browser Console
Press F12 and check for:
- Network errors when requesting invoices
- WebLN connection errors
- Nostr event publishing errors

### Verify Nostr Events
Check that these events are published:
- Kind 34612: Report verification
- Kind 34611: Payment confirmation

### Check Local State
The app uses Zustand store for state management:
- Campaign spent amounts should update
- Report statuses should change
- UI should reflect latest state

## Next Steps After Testing

Based on testing results, consider implementing:
1. Better error messages for specific failure cases
2. Retry mechanisms for failed invoice requests
3. Payment receipt downloads
4. Email/Nostr notifications for payments
5. Bulk payment operations