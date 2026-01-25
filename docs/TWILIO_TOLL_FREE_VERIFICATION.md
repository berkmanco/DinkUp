# Twilio Toll-Free Verification Reference

## Submission Information for DinkUp

Last updated: January 23, 2026

---

## Common Rejection Codes

### Error 30504: Single Opt-In for Multiple Use Cases Not Allowed ⚠️
**Cause**: One checkbox cannot cover multiple message types (e.g., transactional + promotional).
**Fix**: Use ONE checkbox for ONE use case only. We now use SMS exclusively for transactional session notifications (reminders + payments). Waitlist alerts are email-only.

### Error 30498: Opt-In Workflow Must Match Submission Details
**Cause**: Your description doesn't match the screenshot/proof you provided.
**Fix**: Ensure screenshot shows checkbox unchecked by default and matches the workflow described.

### Error 30510: Opt-In Example Must Be Complete, Branded, and Legible
**Cause**: Screenshot is cropped, missing branding, or illegible.
**Fix**: Show full Settings page with DinkUp logo/text, phone field, unchecked checkbox, and complete disclosure text.

### Error 30513: Consent for Messaging is a Requirement
**Cause**: SMS appears mandatory or consent language is unclear.
**Fix**: Emphasize SMS is OPTIONAL, not required to use DinkUp.

---

## Submission Fields

### Business Information
- **Legal Entity Name**: Berkman Consulting LLC
- **Website URL**: https://berkman.co
- **First Name**: Mike
- **Last Name**: Berkman
- **Email**: mike@berkman.co
- **Phone Number**: (614) 537-6574

### Opt-In Details

**Opt-in Type**: `Web Form`

**Proof of Consent (URL)**:
```
https://www.dinkup.link/screenshots/sms-consent.png
```

**IMPORTANT**: Screenshot must show:
- SMS checkbox UNCHECKED by default
- Full consent text visible
- Phone number field visible
- Clear, readable image quality

### Use Case Description (500 character limit)

**Recommended Language (EXACTLY matches Settings page)**:
```
DinkUp is a pickleball coordination app. Users receive OPTIONAL SMS for time-sensitive session notifications: 24-hour game reminders and payment requests.

Opt-in: Users go to Settings, enter phone, check: "I agree to receive SMS text messages from DinkUp" with disclosure: "Receive text message notifications for time-sensitive session updates including 24-hour game reminders and payment requests. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe at any time." Checkbox unchecked by default. Email is the default notification method; SMS is optional and requires explicit consent.
```

**Character count**: 500 (exactly at limit)

**Key Points**:
- ✅ SINGLE use case only (transactional session notifications)
- ✅ Emphasize "OPTIONAL" - SMS not required
- ✅ Quote exact checkbox label and disclosure text
- ✅ Mention unchecked by default
- ✅ State email as default alternative
- ✅ No promotional/marketing language

### Sample Message

**Session Reminder**:
```
🏓 DinkUp Reminder: Weekend Warriors session tomorrow at 10:00 AM. See you on the court!
```

**Payment Request**:
```
DinkUp: Payment request for Weekend Warriors session on 1/25. You owe $8.50. Pay via Venmo: @dinkup
```

### Additional Information (Optional)

**Recommended Language**:
```
SMS is strictly opt-in only. Users cannot receive SMS without explicitly checking the consent checkbox in their Settings page. The consent language clearly identifies DinkUp as the sender and describes message types (session reminders and payment requests). Users can disable SMS at any time by unchecking the box or replying STOP. Email is used for all other notifications.
```

### Opt-In Confirmation Message (Optional)

**Recommended**:
```
You've enabled SMS notifications for DinkUp. You'll receive time-sensitive session alerts like 24-hour game reminders and payment requests. Reply STOP to unsubscribe anytime.
```

### Help Message (Optional)

**Recommended**:
```
DinkUp SMS Help: You're subscribed to time-sensitive pickleball notifications. Visit dinkup.link/settings to manage preferences. Reply STOP to unsubscribe. Msg&data rates may apply.
```

---

## Pre-Submission Checklist

Before resubmitting, verify:

- [ ] Screenshot shows checkbox **UNCHECKED**
- [ ] Screenshot URL is publicly accessible (test in incognito)
- [ ] Use case description mentions "OPTIONAL" for SMS
- [ ] Use case description quotes exact checkbox label
- [ ] Use case description is under 500 characters
- [ ] Sample message is realistic and matches actual notifications
- [ ] No mention of SMS during registration (Settings only)
- [ ] Terms page matches workflow (Settings-only opt-in)

---

## What Makes Our Opt-In Compliant

✅ **Express Written Consent**: Checkbox with explicit "I agree to receive SMS text messages from DinkUp"

✅ **Unchecked by Default**: Users must actively check the box

✅ **Clear Disclosure**: Message frequency, data rates, and STOP instructions visible at point of opt-in

✅ **Separate from Terms**: SMS consent is not buried in Terms of Service

✅ **Optional**: Email is the default; SMS requires separate opt-in

✅ **Revocable**: Users can uncheck box in Settings or reply STOP anytime

---

## SMS Workflow (Settings Only)

1. User creates account (email required, phone optional)
2. User navigates to Settings page
3. User enters phone number (optional field)
4. User checks: "I agree to receive SMS text messages from DinkUp"
5. Full disclosure shown under checkbox
6. Checkbox unchecked by default
7. User can uncheck anytime to disable SMS

**NOT** collected during registration - email only during signup.

---

## Message Types (SMS Only)

SMS is reserved for **time-sensitive updates only**:

1. **24-hour game reminders** - Day before scheduled session
2. **Waitlist promotions** - When promoted from waitlist to active roster
3. **Session cancellations** - When session is cancelled by owner

All other notifications (session creation, roster lock, payment reminders, etc.) are sent via email.

---

## Common Mistakes to Avoid

❌ **Don't** make SMS sound mandatory ("Users receive SMS notifications...")  
✅ **Do** emphasize it's optional ("Users can receive OPTIONAL SMS notifications...")

❌ **Don't** use a screenshot with checkbox checked  
✅ **Do** show checkbox unchecked by default

❌ **Don't** select "Verbal" opt-in type (that's for phone calls)  
✅ **Do** select "Web Form" for checkbox-based opt-in

❌ **Don't** bundle SMS consent in Terms of Service  
✅ **Do** have explicit checkbox at point of opt-in

❌ **Don't** collect SMS consent during registration  
✅ **Do** collect only in Settings with full disclosure

---

## Resubmission Timeline

- You have **7 days** to resubmit after rejection
- Resubmissions within 7 days go to prioritized queue
- After 7 days, still can resubmit but no priority (normal queue)

---

## Support

If rejected again:
1. Check error codes in rejection email
2. Review this document for matching fixes
3. Verify screenshot is current and accessible
4. Contact Twilio support via dashboard if unclear
5. Ask their chatbot for specific guidance on error codes
