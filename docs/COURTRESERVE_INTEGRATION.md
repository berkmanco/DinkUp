# CourtReserve Integration Research

## Target Facility
- **Name**: Pickle Shack
- **URL**: https://app.courtreserve.com/Online/Reservations/Index/7878
- **Facility ID**: 7878
- **Courts**: 10 (Court #1 - CT10, all Pickleball)

## Research Needed

### 1. API Discovery
Check browser DevTools Network tab while loading the reservations page:
- Look for XHR/Fetch requests
- Note any `/api/` endpoints
- Check for JSON responses with availability data

### 2. Potential Endpoints to Try
Based on URL patterns, try:
```
GET https://app.courtreserve.com/api/reservations?orgId=7878&date=2026-01-18
GET https://app.courtreserve.com/Online/Reservations/GetAvailability/7878
GET https://app.courtreserve.com/Online/Calendar/7878
```

### 3. Authentication
- CourtReserve uses session-based auth
- Would need to either:
  - Store user's session cookie (security concern)
  - Use OAuth if available
  - Scrape while user is logged in (limited)

## Integration Options

### Option A: User-Provided Session
User logs in to CourtReserve, we use their session to fetch availability.
- Pros: Full access to their view
- Cons: Session expires, security concerns

### Option B: Public Calendar (if available)
Check if Pickle Shack has a public calendar feed.
- Pros: No auth needed
- Cons: May not exist, limited data

### Option C: Manual Entry
User manually enters court availability in DinkUp.
- Pros: Simple, no integration needed
- Cons: Extra work for user

### Option D: Screenshot/OCR
User uploads screenshot, we parse it.
- Pros: Works with any system
- Cons: Complex, error-prone

## Next Steps
1. Open browser DevTools on the reservations page
2. Go to Network tab, filter by XHR/Fetch
3. Refresh the page and note all API calls
4. Share the endpoint URLs and sample responses
