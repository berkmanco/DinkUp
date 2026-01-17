# DinkUp Smoke Test Checklist

## Automated Tests ✅ (123 tests)

These areas are covered by `npm test`:

| Area | Tests | Coverage |
|------|-------|----------|
| Pools | 12 | CRUD, players, registration links |
| Sessions | 15 | CRUD, participants, costs, status |
| Registration | 14 | Token validation, player creation, full flow |
| Payments | 16 | Venmo links, CRUD, status, summaries |
| Notifications | 10 | All notification types, logging |
| Venmo Parser | 57 | Parsing, hashtag extraction, auto-matching |

Run with: `npm test`

---

## Manual Smoke Test Checklist

Run through these on **production** (https://www.dinkup.link) - items that can't be automated.

### Authentication
- [ ] **Login**: Go to /login → Enter email → Check inbox → Receive magic link
- [ ] **Auth redirect**: Click magic link → Redirected to /dashboard
- [ ] **Logout**: Click name dropdown → Sign Out → Redirected to home
- [ ] **Safari login**: Test magic link in Safari (known issue)
- [ ] **Gmail app**: Test magic link from Gmail app → Chrome

### Core User Flow
- [ ] **View pools**: Go to /dashboard → See your pools
- [ ] **Create session**: Pool → "Create Session" → Fill form → Submit → Appears in list
- [ ] **Generate invite**: Pool details → "Generate Link" → Auto-copied to clipboard
- [ ] **Registration**: Open invite in incognito → Fill form → Player added to pool

### Session Lifecycle
- [ ] **Opt in**: Dashboard → Session → Click "I'm In" → Status = Committed
- [ ] **Lock roster**: Session details → "Lock Roster" → Payments generated
- [ ] **View payments**: Scroll to payments section → See Venmo links
- [ ] **Request payment**: Click "Request" → Opens Venmo with hashtag in note

### Payment Flow
- [ ] **Venmo hashtag**: Check note contains `#dinkup-{uuid}`
- [ ] **Mark paid**: Click "Mark Paid" → Status updates
- [ ] **Forgive**: Click "Forgive" → Payment forgiven, progress bar updates
- [ ] **Send reminder**: Click "Send Reminder" → Notification sent

### Notifications
- [ ] **Email delivery**: Check emails arrive (not in spam)
- [ ] **SMS delivery**: Check SMS arrives (if Twilio verified)
- [ ] **Session reminder**: Verify "today" vs "tomorrow" language is correct

### Venmo Auto-Matching
- [ ] **Pay with hashtag**: Complete Venmo payment with `#dinkup-{id}` in note
- [ ] **Forward email**: Forward Venmo confirmation to payments@dinkup.link
- [ ] **Auto-match**: Check payment auto-marked as paid in app

### Settings
- [ ] **Update profile**: Change name/phone/Venmo → Save → Persists on reload
- [ ] **Notification prefs**: Toggle email/SMS → Save → Preferences saved

### Mobile Experience
- [ ] **No horizontal scroll**: Navigate all pages on mobile → No side-scrolling
- [ ] **PWA iOS**: Safari → Share → "Add to Home Screen" → Launches full screen
- [ ] **PWA Android**: Chrome → Menu → "Add to Home Screen" → Standalone mode
- [ ] **Offline**: Turn off network → Open app → Cached pages load

### Link Previews
- [ ] **iMessage**: Paste https://www.dinkup.link → Shows logo, title, description
- [ ] **Slack**: Paste link → Shows OG metadata

---

## Known Issues

- **Safari magic link**: May not complete login (cross-origin redirect issue)
- **Gmail app → Chrome**: Token handoff may fail
- **SMS**: Requires Twilio verification for toll-free or local number

---

## Notes

- **Environment**: Production (https://www.dinkup.link)
- **Clean up**: Delete test sessions/players after
- **Last updated**: Jan 16, 2026
