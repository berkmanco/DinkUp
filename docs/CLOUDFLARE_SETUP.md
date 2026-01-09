# Cloudflare Email Worker Setup

## Your Configuration Values

| Variable | Value |
|----------|-------|
| `SUPABASE_FUNCTION_URL` | `https://zypmcxulznrmzqaflkui.supabase.co/functions/v1/parse-venmo` |
| `VENMO_WEBHOOK_SECRET` | `80d1fee4feb6f6a310fca37767f6d6df1ad13a1e0f368fa473c1a19a2527de2c` |

---

## Step 1: Enable Email Routing

1. Go to **Cloudflare Dashboard** → Select `dinkup.link`
2. Click **Email** → **Email Routing**
3. Click **Enable Email Routing** (if not already enabled)
4. Add the required MX and TXT records when prompted
5. Wait for DNS verification (usually quick if Cloudflare is already your DNS)

---

## Step 2: Create the Email Worker

1. Go to **Email** → **Email Workers**
2. Click **Create Worker**
3. Name: `venmo-parser`
4. Paste the code from `docs/cloudflare-venmo-worker.js` in this repo
5. Click **Save and Deploy**

---

## Step 3: Add Environment Variables to Worker

1. In the worker, go to **Settings** → **Variables**
2. Add these variables:

| Name | Value |
|------|-------|
| `SUPABASE_FUNCTION_URL` | `https://zypmcxulznrmzqaflkui.supabase.co/functions/v1/parse-venmo` |
| `VENMO_WEBHOOK_SECRET` | `80d1fee4feb6f6a310fca37767f6d6df1ad13a1e0f368fa473c1a19a2527de2c` |

3. Click **Save**

---

## Step 4: Create Email Route

1. Go to **Email** → **Email Routing** → **Routing Rules**
2. Click **Create address**
3. Enter:
   - **Custom address**: `venmo` (becomes `venmo@dinkup.link`)
   - **Action**: Send to a Worker
   - **Destination**: Select `venmo-parser`
4. Click **Save**

---

## Step 5: Configure Gmail Forwarding

1. Go to **Gmail Settings** → **Filters and Blocked Addresses**
2. Click **Create a new filter**
3. In the **From** field, enter: `venmo@venmo.com`
4. Click **Create filter**
5. Check **Forward it to**: `venmo@dinkup.link`
   - If the address isn't listed, click **Add forwarding address** first
6. Gmail will send a verification email to `venmo@dinkup.link`
7. Check **Cloudflare Worker logs** for the verification link/code
8. Complete verification in Gmail

---

## Step 6: Test the Integration

### Option A: Send a test Venmo payment to yourself
Include `#dinkup-test` in the note and watch Cloudflare logs.

### Option B: Manually test the edge function
```bash
curl -X POST https://zypmcxulznrmzqaflkui.supabase.co/functions/v1/parse-venmo \
  -H "Content-Type: application/json" \
  -H "X-Venmo-Webhook-Secret: 80d1fee4feb6f6a310fca37767f6d6df1ad13a1e0f368fa473c1a19a2527de2c" \
  -d '{
    "from": "venmo@venmo.com",
    "subject": "John Doe paid you $16.00",
    "text": "Thanks for organizing! #dinkup-test",
    "date": "2026-01-09T10:00:00Z"
  }'
```

---

## Troubleshooting

### Gmail verification email not arriving?
- Check Cloudflare Worker logs in **Workers & Pages** → Your worker → **Logs**
- The verification email should appear there with a link or code

### Emails not being processed?
- Verify Email Routing is enabled and DNS is active (green checkmarks)
- Check the email route is pointing to the correct worker
- Look at Worker logs for errors

### Payments not auto-matching?
- Ensure the Venmo note contains `#dinkup-{payment_id}`
- Check `venmo_transactions` table in Supabase for the raw data
- Verify the amount matches exactly

---

## Architecture Diagram

```
Gmail (venmo@venmo.com)
    ↓ filter: forward to venmo@dinkup.link
Cloudflare Email Routing
    ↓ route to worker
Cloudflare Email Worker (venmo-parser)
    ↓ parse MIME → JSON, POST to Supabase
Supabase Edge Function (parse-venmo)
    ↓ extract sender, amount, hashtag
venmo_transactions table
    ↓ auto-match by hashtag
payments table (status → paid)
```
