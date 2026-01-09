/**
 * Cloudflare Email Worker - Venmo Email Parser
 * 
 * Receives Venmo emails forwarded from Gmail and sends to Supabase for processing.
 */

export default {
  async email(message, env, ctx) {
    console.log(`Received email from: ${message.from}`);
    const subject = message.headers.get('subject') || '';
    console.log(`Subject: ${subject}`);

    // DEBUG: Check if env vars are loaded
    console.log('SUPABASE_FUNCTION_URL set:', !!env.SUPABASE_FUNCTION_URL);
    console.log('SUPABASE_ANON_KEY set:', !!env.SUPABASE_ANON_KEY);
    console.log('VENMO_WEBHOOK_SECRET set:', !!env.VENMO_WEBHOOK_SECRET);

    // Check if it's a Venmo email (from address OR subject contains Venmo patterns)
    const from = message.from.toLowerCase();
    const subjectLower = subject.toLowerCase();

    const isVenmoEmail = 
      from.includes('venmo') || 
      subjectLower.includes('paid you') ||
      subjectLower.includes('you paid') ||
      subjectLower.includes('venmo');

    if (!isVenmoEmail) {
      console.log('Not a Venmo email, ignoring');
      return;
    }

    try {
      const rawEmail = await new Response(message.raw).text();
      
      // Extract text body using multiple strategies
      let textBody = '';
      
      // Strategy 1: Look for plain text section in MIME
      const textMatch = rawEmail.match(/Content-Type:\s*text\/plain[^]*?\r?\n\r?\n([^]*?)(?:\r?\n--|\r?\n\r?\nContent-Type:)/i);
      if (textMatch) {
        textBody = textMatch[1].trim();
      }
      
      // Strategy 2: If empty, try to find quoted content (for forwarded emails)
      if (!textBody) {
        const quotedMatch = rawEmail.match(/---------- Forwarded message ---------[^]*?(?:\r?\n\r?\n|\n\n)([^]*?)(?:--|$)/i);
        if (quotedMatch) {
          textBody = quotedMatch[1].trim();
        }
      }
      
      // Strategy 3: Look for any text between blank lines that might contain hashtag
      if (!textBody) {
        const hashtagMatch = rawEmail.match(/(#[\w-]+)/);
        if (hashtagMatch) {
          // Find the line containing the hashtag
          const lines = rawEmail.split('\n');
          for (const line of lines) {
            if (line.includes('#') && !line.includes('Content-Type')) {
              textBody = line.trim();
              break;
            }
          }
        }
      }
      
      // Strategy 4: Extract any line that looks like a Venmo note
      if (!textBody) {
        const lines = rawEmail.split('\n');
        for (const line of lines) {
          const cleanLine = line.trim();
          // Venmo notes are usually short and may contain hashtags or be payment descriptions
          if (cleanLine.length > 0 && cleanLine.length < 200 && 
              !cleanLine.includes(':') && !cleanLine.includes('=') &&
              !cleanLine.startsWith('--') && !cleanLine.startsWith('<')) {
            // Skip header-like lines
            if (!/^(From|To|Subject|Date|Content|MIME|Message-ID|Received)/i.test(cleanLine)) {
              textBody = cleanLine;
              break;
            }
          }
        }
      }

      console.log('Extracted text body length:', textBody.length);
      console.log('Text body preview:', textBody.substring(0, 200));

      const payload = {
        from: message.from,
        to: message.to,
        subject: subject,
        text: textBody,
        html: '', // We focus on text extraction
        date: message.headers.get('date'),
        messageId: message.headers.get('message-id'),
        // Include raw email for debugging (truncated)
        rawPreview: rawEmail.substring(0, 2000),
      };

      console.log('Sending to Supabase...');

      const response = await fetch(env.SUPABASE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
          'X-Venmo-Webhook-Secret': env.VENMO_WEBHOOK_SECRET,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('Result:', JSON.stringify(result));
    } catch (error) {
      console.error('Error:', error);
    }
  },
};
