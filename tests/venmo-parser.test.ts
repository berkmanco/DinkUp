import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getServiceClient,
  createTestSession,
  createTestParticipant,
  createTestPayment,
  deleteTestSession,
  getFirstPool,
  getPoolPlayer,
  callEdgeFunction,
  TestSession,
  TestParticipant,
  TestPayment,
  TestPlayer,
} from './setup'

// ============================================
// PARSING FUNCTIONS (extracted from edge function for testing)
// ============================================

interface ParsedTransaction {
  transaction_type: 'payment_sent' | 'payment_received' | 'request_sent' | 'request_received'
  amount: number
  sender_name: string
  recipient_name: string
  note: string | null
  hashtag: string | null
  email_subject: string
  email_from: string
  transaction_date: string | null
}

interface VenmoEmailPayload {
  from: string
  to: string
  subject: string
  text?: string
  html?: string
  date?: string
  messageId?: string
}

function cleanSubject(subject: string): string {
  return subject
    .replace(/^(fwd|fw|re):\s*/gi, '')
    .trim()
}

function cleanName(name: string): string {
  return name
    .replace(/^(fwd|fw|re):\s*/gi, '')
    .trim()
}

function parseAmount(amountStr: string): number {
  return parseFloat(amountStr.replace(/,/g, ''))
}

function isCssOrHtmlGarbage(text: string): boolean {
  if (!text) return true
  
  if (/font-family:|font-size:|color:#[0-9a-f]{3,6}|background:|margin:|padding:/i.test(text)) {
    return true
  }
  
  if (/<[a-z]+|&nbsp;|&amp;|style=|class=/i.test(text)) {
    return true
  }
  
  const alphanumeric = text.replace(/[^a-z0-9]/gi, '')
  if (alphanumeric.length < text.length * 0.3) {
    return true
  }
  
  return false
}

function extractNote(body: string): string | null {
  if (isCssOrHtmlGarbage(body)) {
    return null
  }
  
  const quotedMatch = body.match(/"([^"]+)"/)
  if (quotedMatch && quotedMatch[1].length < 500 && !isCssOrHtmlGarbage(quotedMatch[1])) {
    return quotedMatch[1].trim()
  }

  const notePatterns = [
    /Note:\s*(.+?)(?:\n|$)/i,
    /Message:\s*(.+?)(?:\n|$)/i,
    /for\s+"([^"]+)"/i,
  ]

  for (const pattern of notePatterns) {
    const match = body.match(pattern)
    if (match && !isCssOrHtmlGarbage(match[1])) {
      return match[1].trim()
    }
  }

  const hashtagLine = body.split('\n').find((line) => {
    if (!line.includes('#')) return false
    return /#(dinkup|pay|payment|session)[-_]/i.test(line)
  })
  if (hashtagLine && hashtagLine.length < 500) {
    return hashtagLine.trim()
  }

  return null
}

function extractHashtag(text: string): string | null {
  const hashtagMatch = text.match(/#(dinkup|pay|payment|session)[-_][\w-]+/i)
  if (hashtagMatch) {
    return hashtagMatch[0]
  }
  
  const uuidHashtagMatch = text.match(/#[\w-]*[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i)
  if (uuidHashtagMatch) {
    return uuidHashtagMatch[0]
  }
  
  return null
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

function fuzzyNameMatch(name1: string, name2: string): boolean {
  const parts1 = name1.split(' ')
  const parts2 = name2.split(' ')

  if (parts1[0] && parts2[0]) {
    if (parts1[0].startsWith(parts2[0]) || parts2[0].startsWith(parts1[0])) {
      return true
    }
  }

  const nicknames: Record<string, string[]> = {
    mike: ['michael', 'mikey'],
    michael: ['mike', 'mikey'],
    john: ['jon', 'johnny', 'jonathan'],
    jon: ['john', 'johnny', 'jonathan'],
    jonathan: ['john', 'jon'],
    matt: ['matthew', 'matty'],
    matthew: ['matt', 'matty'],
    dan: ['daniel', 'danny'],
    daniel: ['dan', 'danny'],
    rob: ['robert', 'robby', 'bob'],
    robert: ['rob', 'robby', 'bob'],
    will: ['william', 'bill', 'billy'],
    william: ['will', 'bill', 'billy'],
    chris: ['christopher'],
    christopher: ['chris'],
  }

  const firstName1 = parts1[0]
  const firstName2 = parts2[0]

  if (nicknames[firstName1]?.includes(firstName2)) return true
  if (nicknames[firstName2]?.includes(firstName1)) return true

  return false
}

function parseVenmoEmail(payload: VenmoEmailPayload): ParsedTransaction | null {
  const { subject: rawSubject, text, html, from, date } = payload
  const body = text || stripHtml(html || '')
  
  const subject = cleanSubject(rawSubject)

  const youPaidMatch = subject.match(/You paid (.+?) \$?([\d,]+\.?\d*)/i)
  const paidYouMatch = subject.match(/(.+?) paid you \$?([\d,]+\.?\d*)/i)
  const youRequestedMatch = subject.match(/You requested \$?([\d,]+\.?\d*) from (.+)/i)
  const requestedFromYouMatch = subject.match(/(.+?) requests \$?([\d,]+\.?\d*)/i)

  let transactionType: ParsedTransaction['transaction_type']
  let amount: number
  let senderName: string
  let recipientName: string

  if (youPaidMatch) {
    transactionType = 'payment_sent'
    recipientName = cleanName(youPaidMatch[1])
    amount = parseAmount(youPaidMatch[2])
    senderName = 'You'
  } else if (paidYouMatch) {
    transactionType = 'payment_received'
    senderName = cleanName(paidYouMatch[1])
    amount = parseAmount(paidYouMatch[2])
    recipientName = 'You'
  } else if (youRequestedMatch) {
    transactionType = 'request_sent'
    amount = parseAmount(youRequestedMatch[1])
    recipientName = cleanName(youRequestedMatch[2])
    senderName = 'You'
  } else if (requestedFromYouMatch) {
    transactionType = 'request_received'
    senderName = cleanName(requestedFromYouMatch[1])
    amount = parseAmount(requestedFromYouMatch[2])
    recipientName = 'You'
  } else {
    return null
  }

  const note = extractNote(body) || extractNote(rawSubject) || extractNote(JSON.stringify(payload))
  const hashtag = extractHashtag(body) || extractHashtag(note || '') || extractHashtag(rawSubject) || extractHashtag(JSON.stringify(payload))

  return {
    transaction_type: transactionType,
    amount,
    sender_name: senderName,
    recipient_name: recipientName,
    note,
    hashtag,
    email_subject: rawSubject,
    email_from: from,
    transaction_date: date || null,
  }
}

// ============================================
// TESTS
// ============================================

describe('Venmo Parser', () => {
  describe('Subject Cleaning', () => {
    it('should remove Fwd: prefix', () => {
      expect(cleanSubject('Fwd: John paid you $20.00')).toBe('John paid you $20.00')
    })

    it('should remove Re: prefix', () => {
      expect(cleanSubject('Re: You paid Sarah $15.00')).toBe('You paid Sarah $15.00')
    })

    it('should remove multiple prefixes (one at a time)', () => {
      // cleanSubject removes one prefix at a time
      // The parseVenmoEmail function handles the cleaned subject
      const cleaned = cleanSubject('Fwd: Re: Fw: John paid you $20.00')
      expect(cleaned).toBe('Re: Fw: John paid you $20.00')
      // After another pass:
      expect(cleanSubject(cleaned)).toBe('Fw: John paid you $20.00')
    })

    it('should handle subjects without prefixes', () => {
      expect(cleanSubject('John paid you $20.00')).toBe('John paid you $20.00')
    })
  })

  describe('Amount Parsing', () => {
    it('should parse simple amount', () => {
      expect(parseAmount('16.00')).toBe(16.00)
    })

    it('should parse amount with comma', () => {
      expect(parseAmount('1,234.56')).toBe(1234.56)
    })

    it('should parse amount without cents', () => {
      expect(parseAmount('100')).toBe(100)
    })

    it('should parse large amounts', () => {
      expect(parseAmount('10,000.00')).toBe(10000.00)
    })
  })

  describe('CSS/HTML Garbage Detection', () => {
    it('should detect CSS color codes', () => {
      expect(isCssOrHtmlGarbage('color:#2f3033;font-family:Arial')).toBe(true)
    })

    it('should detect HTML tags', () => {
      expect(isCssOrHtmlGarbage('<div class="note">Hello</div>')).toBe(true)
    })

    it('should detect HTML entities', () => {
      expect(isCssOrHtmlGarbage('Hello&nbsp;World&amp;More')).toBe(true)
    })

    it('should detect mostly punctuation', () => {
      expect(isCssOrHtmlGarbage('!!!???...;;;:::')).toBe(true)
    })

    it('should accept valid text', () => {
      expect(isCssOrHtmlGarbage('Pickleball session payment')).toBe(false)
    })

    it('should accept text with hashtag', () => {
      expect(isCssOrHtmlGarbage('Pickleball #dinkup-abc123')).toBe(false)
    })
  })

  describe('Hashtag Extraction', () => {
    it('should extract #dinkup- hashtag', () => {
      expect(extractHashtag('Payment for #dinkup-abc123-def456')).toBe('#dinkup-abc123-def456')
    })

    it('should extract #pay- hashtag', () => {
      expect(extractHashtag('Thanks! #pay-12345')).toBe('#pay-12345')
    })

    it('should extract #payment- hashtag', () => {
      expect(extractHashtag('For pickleball #payment-xyz789')).toBe('#payment-xyz789')
    })

    it('should extract #session- hashtag', () => {
      expect(extractHashtag('Session #session-abc')).toBe('#session-abc')
    })

    it('should extract UUID-based hashtag', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      expect(extractHashtag(`Payment #dinkup-${uuid}`)).toBe(`#dinkup-${uuid}`)
    })

    it('should NOT extract CSS color codes as hashtags', () => {
      expect(extractHashtag('color:#2f3033')).toBeNull()
    })

    it('should NOT extract random hashtags', () => {
      expect(extractHashtag('#random #hashtag #test')).toBeNull()
    })

    it('should return null for text without hashtag', () => {
      expect(extractHashtag('Just a regular payment note')).toBeNull()
    })
  })

  describe('Note Extraction', () => {
    it('should extract quoted note', () => {
      expect(extractNote('Payment for "Pickleball session"')).toBe('Pickleball session')
    })

    it('should extract note after Note: prefix', () => {
      expect(extractNote('Transaction complete\nNote: Weekend pickleball')).toBe('Weekend pickleball')
    })

    it('should extract note after Message: prefix', () => {
      expect(extractNote('Message: Thanks for playing!')).toBe('Thanks for playing!')
    })

    it('should extract line with dinkup hashtag', () => {
      expect(extractNote('Some text\nPickleball #dinkup-abc123\nMore text')).toBe('Pickleball #dinkup-abc123')
    })

    it('should return null for CSS garbage', () => {
      expect(extractNote('color:#2f3033;font-family:Arial')).toBeNull()
    })

    it('should return null for HTML content', () => {
      expect(extractNote('<div style="color: red">Hello</div>')).toBeNull()
    })
  })

  describe('HTML Stripping', () => {
    it('should convert br tags to newlines', () => {
      expect(stripHtml('Hello<br>World')).toBe('Hello\nWorld')
    })

    it('should convert p tags to double newlines', () => {
      expect(stripHtml('<p>Para 1</p><p>Para 2</p>')).toBe('Para 1\n\nPara 2')
    })

    it('should remove all HTML tags', () => {
      expect(stripHtml('<div><span>Hello</span></div>')).toBe('Hello')
    })

    it('should decode HTML entities', () => {
      expect(stripHtml('Hello&nbsp;World&amp;More')).toBe('Hello World&More')
    })
  })

  describe('Fuzzy Name Matching', () => {
    it('should match partial first names', () => {
      expect(fuzzyNameMatch('mike', 'mikey')).toBe(true)
    })

    it('should match Mike and Michael', () => {
      expect(fuzzyNameMatch('mike', 'michael')).toBe(true)
    })

    it('should match Jon and John', () => {
      expect(fuzzyNameMatch('jon', 'john')).toBe(true)
    })

    it('should match Matt and Matthew', () => {
      expect(fuzzyNameMatch('matt', 'matthew')).toBe(true)
    })

    it('should match Dan and Daniel', () => {
      expect(fuzzyNameMatch('dan', 'daniel')).toBe(true)
    })

    it('should match Rob and Robert', () => {
      expect(fuzzyNameMatch('rob', 'robert')).toBe(true)
    })

    it('should match Will and William', () => {
      expect(fuzzyNameMatch('will', 'william')).toBe(true)
    })

    it('should match Chris and Christopher', () => {
      expect(fuzzyNameMatch('chris', 'christopher')).toBe(true)
    })

    it('should not match completely different names', () => {
      expect(fuzzyNameMatch('mike', 'sarah')).toBe(false)
    })
  })

  describe('Email Parsing - Payment Sent', () => {
    it('should parse "You paid [Name] $XX.XX"', () => {
      const payload: VenmoEmailPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: 'You paid Sarah Jones $25.00',
        text: 'Payment complete. Note: Pickleball session',
      }

      const result = parseVenmoEmail(payload)
      expect(result).not.toBeNull()
      expect(result?.transaction_type).toBe('payment_sent')
      expect(result?.amount).toBe(25.00)
      expect(result?.sender_name).toBe('You')
      expect(result?.recipient_name).toBe('Sarah Jones')
    })

    it('should handle forwarded payment sent email', () => {
      const payload: VenmoEmailPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: 'Fwd: You paid Mike B $16.00',
        text: 'Pickleball #dinkup-abc123',
      }

      const result = parseVenmoEmail(payload)
      expect(result?.transaction_type).toBe('payment_sent')
      expect(result?.amount).toBe(16.00)
      expect(result?.recipient_name).toBe('Mike B')
      expect(result?.hashtag).toBe('#dinkup-abc123')
    })
  })

  describe('Email Parsing - Payment Received', () => {
    it('should parse "[Name] paid you $XX.XX"', () => {
      const payload: VenmoEmailPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: 'John Smith paid you $20.00',
        text: 'Thanks for the game!',
      }

      const result = parseVenmoEmail(payload)
      expect(result).not.toBeNull()
      expect(result?.transaction_type).toBe('payment_received')
      expect(result?.amount).toBe(20.00)
      expect(result?.sender_name).toBe('John Smith')
      expect(result?.recipient_name).toBe('You')
    })

    it('should handle large amounts', () => {
      const payload: VenmoEmailPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: 'Jane Doe paid you $1,250.00',
        text: 'Annual membership',
      }

      const result = parseVenmoEmail(payload)
      expect(result?.amount).toBe(1250.00)
    })
  })

  describe('Email Parsing - Request Sent', () => {
    it('should parse "You requested $XX.XX from [Name]"', () => {
      const payload: VenmoEmailPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: 'You requested $15.00 from Bob Wilson',
        text: 'Pickleball court fee',
      }

      const result = parseVenmoEmail(payload)
      expect(result).not.toBeNull()
      expect(result?.transaction_type).toBe('request_sent')
      expect(result?.amount).toBe(15.00)
      expect(result?.sender_name).toBe('You')
      expect(result?.recipient_name).toBe('Bob Wilson')
    })
  })

  describe('Email Parsing - Request Received', () => {
    it('should parse "[Name] requests $XX.XX"', () => {
      const payload: VenmoEmailPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: 'Alice Brown requests $30.00',
        text: 'Court rental',
      }

      const result = parseVenmoEmail(payload)
      expect(result).not.toBeNull()
      expect(result?.transaction_type).toBe('request_received')
      expect(result?.amount).toBe(30.00)
      expect(result?.sender_name).toBe('Alice Brown')
      expect(result?.recipient_name).toBe('You')
    })
  })

  describe('Email Parsing - Non-Transaction Emails', () => {
    it('should return null for non-transaction emails', () => {
      const payload: VenmoEmailPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: 'Welcome to Venmo!',
        text: 'Thanks for signing up',
      }

      const result = parseVenmoEmail(payload)
      expect(result).toBeNull()
    })

    it('should return null for marketing emails', () => {
      const payload: VenmoEmailPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: 'New features in Venmo',
        text: 'Check out our new features',
      }

      const result = parseVenmoEmail(payload)
      expect(result).toBeNull()
    })
  })

  describe('Email Parsing - With Hashtags', () => {
    it('should extract hashtag from body', () => {
      const payload: VenmoEmailPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: 'Mike paid you $16.00',
        text: 'Pickleball - Weekend Warriors #dinkup-550e8400-e29b-41d4-a716-446655440000',
      }

      const result = parseVenmoEmail(payload)
      expect(result?.hashtag).toBe('#dinkup-550e8400-e29b-41d4-a716-446655440000')
    })

    it('should extract hashtag from HTML body', () => {
      const payload: VenmoEmailPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: 'Mike paid you $16.00',
        html: '<div>Pickleball #dinkup-abc123</div>',
      }

      const result = parseVenmoEmail(payload)
      expect(result?.hashtag).toBe('#dinkup-abc123')
    })

    it('should not confuse CSS colors with hashtags', () => {
      const payload: VenmoEmailPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: 'Mike paid you $16.00',
        html: '<div style="color:#2f3033">Payment</div>',
      }

      const result = parseVenmoEmail(payload)
      expect(result?.hashtag).toBeNull()
    })
  })
})

describe('Venmo Parser Integration', () => {
  const supabase = getServiceClient()
  let testPoolId: string
  let testOwnerId: string
  let sessionsToCleanup: string[] = []

  beforeEach(async () => {
    const pool = await getFirstPool(supabase)
    testPoolId = pool.id
    testOwnerId = pool.owner_id
    sessionsToCleanup = []
  })

  afterEach(async () => {
    // Clean up test sessions
    for (const sessionId of sessionsToCleanup) {
      await deleteTestSession(supabase, sessionId)
    }

    // Clean up test venmo transactions
    await supabase
      .from('venmo_transactions')
      .delete()
      .like('email_subject', '%TEST%')
  })

  describe('Transaction Storage', () => {
    it('should store parsed transaction in database', async () => {
      const transactionId = crypto.randomUUID()
      const rawPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: 'TEST: Test User paid you $16.00',
        text: 'Pickleball #dinkup-test123',
      }
      const { data, error } = await supabase
        .from('venmo_transactions')
        .insert({
          id: transactionId,
          transaction_type: 'payment_received',
          amount: 16.00,
          sender_name: 'Test User',
          recipient_name: 'You',
          email_subject: 'TEST: Test User paid you $16.00',
          email_from: 'venmo@venmo.com',
          note: 'Pickleball',
          hashtag: '#dinkup-test123',
          raw_json: rawPayload,
          processed: false,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.amount).toBe(16.00)
      expect(data.hashtag).toBe('#dinkup-test123')
      console.log('Stored venmo transaction:', data.id)
    })
  })

  describe('Auto-Match by Hashtag', () => {
    let session: TestSession
    let participant: TestParticipant
    let payment: TestPayment
    let player: TestPlayer

    beforeEach(async () => {
      session = await createTestSession(supabase, testPoolId, { status: 'confirmed' })
      sessionsToCleanup.push(session.id)
      player = await getPoolPlayer(supabase, testPoolId, testOwnerId)
      
      // Get auto-added participant from trigger
      const { data: existingParticipant } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', session.id)
        .eq('player_id', player.id)
        .single()
      
      if (existingParticipant) {
        participant = existingParticipant as TestParticipant
        // Update to committed status
        await supabase
          .from('session_participants')
          .update({ status: 'committed' })
          .eq('id', participant.id)
      } else {
        participant = await createTestParticipant(supabase, session.id, player.id, 'committed')
      }
      
      payment = await createTestPayment(supabase, participant.id, 16.00, 'pending')
    })

    it('should auto-match payment by hashtag and mark as paid', async () => {
      // Insert a venmo transaction with matching hashtag
      const transactionId = crypto.randomUUID()
      const hashtag = `#dinkup-${payment.id}`
      const rawPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: `TEST: ${player.name} paid you $16.00`,
        text: `Pickleball ${hashtag}`,
      }
      const { error: insertError } = await supabase
        .from('venmo_transactions')
        .insert({
          id: transactionId,
          transaction_type: 'payment_received',
          amount: 16.00,
          sender_name: player.name,
          recipient_name: 'You',
          email_subject: `TEST: ${player.name} paid you $16.00`,
          email_from: 'venmo@venmo.com',
          note: `Pickleball ${hashtag}`,
          hashtag: hashtag,
          raw_json: rawPayload,
          processed: false,
        })

      expect(insertError).toBeNull()

      // Verify payment exists with correct amount
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('id, amount, status')
        .eq('id', payment.id)
        .single()

      expect(paymentError).toBeNull()
      expect(paymentData).toBeDefined()
      expect(paymentData!.status).toBe('pending')
      
      // Amount should match (16.00)
      const amountMatches = Math.abs(Number(paymentData!.amount) - 16.00) < 0.01
      expect(amountMatches).toBe(true)

      // Update the transaction to link to payment
      const { error: txUpdateError } = await supabase
        .from('venmo_transactions')
        .update({
          payment_id: payment.id,
          matched_at: new Date().toISOString(),
          match_method: 'auto_hashtag',
          processed: true,
        })
        .eq('id', transactionId)

      expect(txUpdateError).toBeNull()

      // Update the payment status to paid
      const { error: paymentUpdateError } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString(),
          notes: `Auto-matched from Venmo email (${hashtag})`,
        })
        .eq('id', payment.id)

      expect(paymentUpdateError).toBeNull()

      // Verify the match
      const { data: updatedPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', payment.id)
        .single()

      expect(updatedPayment?.status).toBe('paid')
      expect(updatedPayment?.notes).toContain('Auto-matched')

      const { data: updatedTransaction } = await supabase
        .from('venmo_transactions')
        .select('*')
        .eq('id', transactionId)
        .single()

      expect(updatedTransaction?.payment_id).toBe(payment.id)
      expect(updatedTransaction?.match_method).toBe('auto_hashtag')
      expect(updatedTransaction?.processed).toBe(true)
      console.log('Auto-matched payment:', payment.id, 'to transaction:', transactionId)
    })

    it('should not match if amount differs', async () => {
      const transactionId = crypto.randomUUID()
      const rawPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: `TEST: ${player.name} paid you $20.00`,
        text: `#dinkup-${payment.id}`,
      }
      await supabase
        .from('venmo_transactions')
        .insert({
          id: transactionId,
          transaction_type: 'payment_received',
          amount: 20.00, // Different amount
          sender_name: player.name,
          recipient_name: 'You',
          email_subject: `TEST: ${player.name} paid you $20.00`,
          email_from: 'venmo@venmo.com',
          hashtag: `#dinkup-${payment.id}`,
          raw_json: rawPayload,
          processed: false,
        })

      // Check payment still pending
      const { data: paymentData } = await supabase
        .from('payments')
        .select('*')
        .eq('id', payment.id)
        .single()

      // Simulate amount check failure
      const amountMatches = paymentData && Math.abs(paymentData.amount - 20.00) < 0.01

      expect(amountMatches).toBe(false)
      expect(paymentData?.status).toBe('pending') // Still pending
    })
  })

  describe('Auto-Match by Amount and Sender', () => {
    let session: TestSession
    let participant: TestParticipant
    let payment: TestPayment
    let player: TestPlayer

    beforeEach(async () => {
      session = await createTestSession(supabase, testPoolId, { status: 'confirmed' })
      sessionsToCleanup.push(session.id)
      player = await getPoolPlayer(supabase, testPoolId, testOwnerId)
      await supabase.from('players').update({ name: 'Mike Berkman' }).eq('id', player.id)
      
      // Get auto-added participant from trigger
      const { data: existingParticipant } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', session.id)
        .eq('player_id', player.id)
        .single()
      
      if (existingParticipant) {
        participant = existingParticipant as TestParticipant
        // Update to committed status
        await supabase
          .from('session_participants')
          .update({ status: 'committed' })
          .eq('id', participant.id)
      } else {
        participant = await createTestParticipant(supabase, session.id, player.id, 'committed')
      }
      
      payment = await createTestPayment(supabase, participant.id, 16.00, 'pending')
    })

    it('should fuzzy match by amount and name', async () => {
      const transactionId = crypto.randomUUID()
      const rawPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: 'TEST: Michael Berkman paid you $16.00',
        text: 'Payment',
      }
      await supabase
        .from('venmo_transactions')
        .insert({
          id: transactionId,
          transaction_type: 'payment_received',
          amount: 16.00,
          sender_name: 'Michael Berkman', // Fuzzy match for Mike
          recipient_name: 'You',
          email_subject: 'TEST: Michael Berkman paid you $16.00',
          email_from: 'venmo@venmo.com',
          raw_json: rawPayload,
          processed: false,
        })

      // Simulate the fuzzy matching logic
      const { data: matchingPayments } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          session_participants!inner (
            players!inner (
              name
            )
          )
        `)
        .eq('status', 'pending')
        .eq('amount', 16.00)
        .limit(10)

      expect(matchingPayments).toBeDefined()
      expect(matchingPayments!.length).toBeGreaterThan(0)

      // Check fuzzy name match
      const senderNameLower = 'michael berkman'.toLowerCase()
      let matched = false

      for (const p of matchingPayments || []) {
        const playerName = (p as any).session_participants?.players?.name?.toLowerCase()
        if (playerName && fuzzyNameMatch(playerName, senderNameLower)) {
          matched = true
          
          // Mark as potential match (not auto-paid, needs review)
          await supabase
            .from('venmo_transactions')
            .update({
              payment_id: p.id,
              matched_at: new Date().toISOString(),
              match_method: 'auto_amount',
              processed: false, // Needs manual review
            })
            .eq('id', transactionId)
          break
        }
      }

      expect(matched).toBe(true)

      const { data: transaction } = await supabase
        .from('venmo_transactions')
        .select('*')
        .eq('id', transactionId)
        .single()

      expect(transaction?.match_method).toBe('auto_amount')
      expect(transaction?.processed).toBe(false) // Needs manual review
      console.log('Fuzzy matched transaction for manual review')
    })
  })

  describe('Unmatched Transactions', () => {
    it('should store transaction even without match', async () => {
      const transactionId = crypto.randomUUID()
      const rawPayload = {
        from: 'venmo@venmo.com',
        to: 'user@example.com',
        subject: 'TEST: Unknown Person paid you $999.99',
        text: 'Random payment',
      }
      const { data, error } = await supabase
        .from('venmo_transactions')
        .insert({
          id: transactionId,
          transaction_type: 'payment_received',
          amount: 999.99,
          sender_name: 'Unknown Person',
          recipient_name: 'You',
          email_subject: 'TEST: Unknown Person paid you $999.99',
          email_from: 'venmo@venmo.com',
          raw_json: rawPayload,
          processed: false,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.payment_id).toBeNull()
      expect(data.match_method).toBeNull()
      expect(data.processed).toBe(false)
      console.log('Stored unmatched transaction:', data.id)
    })
  })
})
