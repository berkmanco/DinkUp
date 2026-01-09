# DinkUp Smoke Test Checklist

Run through this on **production** (https://www.dinkup.link) to validate the full flow.

---

## 1. Authentication

| Test | Steps | Expected |
|------|-------|----------|
| ☐ Login | Go to /login → Enter email → Check inbox | Receive magic link email |
| ☐ Auth redirect | Click magic link | Redirected to /dashboard |
| ☐ Logout | Click name dropdown → Sign Out | Redirected to home |

---

## 2. Core Flow (as Pool Owner)

| Test | Steps | Expected |
|------|-------|----------|
| ☐ View pools | Go to /dashboard | See your pools |
| ☐ Create session | Click pool → "Create Session" → Fill form → Submit | Session created, appears in list |
| ☐ Generate invite link | Pool details → "Generate Link" | Link auto-copied to clipboard ✨ |
| ☐ Test registration | Open invite link in incognito → Fill form | Player added to pool |

---

## 3. Session Lifecycle

| Test | Steps | Expected |
|------|-------|----------|
| ☐ Opt into session | Dashboard → "Join a Session" → Click "I'm In" | Status changes to Committed |
| ☐ Lock roster | Session details → "Lock Roster" | Payments generated, notification sent |
| ☐ View payments | Scroll to payments section | See payment list with Venmo links |
| ☐ Request payment | Click "Request" on a payment | Opens Venmo with pre-filled note |

---

## 4. Payment Flow

| Test | Steps | Expected |
|------|-------|----------|
| ☐ Venmo hashtag | Check Venmo note | Contains `#dinkup-{uuid}` for auto-matching |
| ☐ Mark paid | Click "Mark Paid" | Payment status updates to Paid |
| ☐ Forgive payment | Click "Forgive" → Confirm | Payment marked forgiven, progress bar updates |
| ☐ Send reminder | Click "Send Reminder" | Notification sent to player |

---

## 5. Venmo Auto-Matching (if configured)

| Test | Steps | Expected |
|------|-------|----------|
| ☐ Complete Venmo payment | Pay via Venmo link with hashtag | Email forwarded to Cloudflare |
| ☐ Auto-match | Check `venmo_transactions` table | Transaction logged, payment auto-marked paid |

---

## 6. Settings

| Test | Steps | Expected |
|------|-------|----------|
| ☐ Update profile | Settings → Change name/phone/Venmo → Save | Changes persist on reload |
| ☐ Notification prefs | Toggle email/SMS → Save | Preferences saved |

---

## 7. Mobile Experience

| Test | Steps | Expected |
|------|-------|----------|
| ☐ No horizontal scroll | Navigate all pages | No side-scrolling anywhere |
| ☐ PWA install (iOS) | Safari → Share → "Add to Home Screen" | App icon appears, launches full screen |
| ☐ PWA install (Android) | Chrome menu → "Add to Home Screen" | App icon appears, launches standalone |
| ☐ Offline access | Turn off network → Open app | Cached pages still load |

---

## 8. Link Previews

| Test | Steps | Expected |
|------|-------|----------|
| ☐ iMessage preview | Paste https://www.dinkup.link in iMessage | Shows logo, title, description |
| ☐ Slack preview | Paste link in Slack | Shows OG metadata |

---

## Notes

- **Environment**: Production (https://www.dinkup.link)
- **Clean up**: Delete test sessions/players after if needed
- **SMS**: Currently pending Twilio toll-free verification (won't deliver yet)
