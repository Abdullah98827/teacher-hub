const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GROQ_KEY     = Deno.env.get('GROQ_API_KEY');
    const GOOGLE_KEY   = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GROQ_KEY) throw new Error('GROQ_API_KEY not configured in Supabase secrets');

    const body = await req.json();
    const { text, language, languageCode, subject, yearGroup, resourceId, userId } = body;

    if (!text || !language || !languageCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text, language, languageCode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`EAL Adapter (Groq): ${text.length} chars | ${language} | ${subject} | ${yearGroup}`);

    // ── Build prompt ──────────────────────────────────────────────────────────
    const subjectContext = subject && subject !== 'general' ? `Subject: ${subject}` : '';
    const yearContext    = yearGroup && yearGroup !== 'any'  ? `Year Group: ${yearGroup}` : '';
    const context        = [subjectContext, yearContext].filter(Boolean).join(' | ');

    const prompt = `You are an expert UK teacher specialising in supporting English as an Additional Language (EAL) learners.

A teacher has provided the following educational content and needs you to adapt it for EAL students whose home language is ${language}.
${context ? `Context: ${context}` : ''}

ORIGINAL CONTENT:
${text}

Provide a complete EAL adaptation using EXACTLY these section headers and no other text:

##SIMPLIFIED##
Rewrite the content using simple, clear English. Use short sentences (maximum 15 words each). Replace complex vocabulary with simpler alternatives. Keep all the same information but make it accessible for EAL learners. Use active voice. Add line breaks between paragraphs.

##VOCABULARY##
List the 8 most important or difficult words from the original content. Format EXACTLY as:
Word: [word]
Definition: [simple child-friendly definition]
Example: [a simple example sentence]
---
(repeat for each word, always ending with ---)

##TEACHING_TIPS##
Provide 5 specific practical teaching strategies for delivering this content to EAL learners. Number each tip 1-5.

##GLOSSARY_TERMS##
List exactly 8 key terms from the content as a comma-separated list only. No definitions. Example format: photosynthesis, chlorophyll, glucose, oxygen, sunlight, energy, leaves, roots

Return ONLY the four sections. No introduction, no conclusion, no extra commentary.`;

    // ── Call Groq API ─────────────────────────────────────────────────────────
    // Using llama-3.3-70b — Groq's best free model, extremely fast
    console.log('Calling Groq API...');
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2000,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: 'You are an expert UK teacher specialising in EAL (English as an Additional Language) support. You always respond in exactly the structured format requested with no extra text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', errText);
      throw new Error(`Groq API failed: ${groqRes.status} — ${errText}`);
    }

    const groqData  = await groqRes.json();
    const rawResponse = groqData.choices?.[0]?.message?.content ?? '';
    console.log('Groq responded, parsing sections...');

    if (!rawResponse) throw new Error('Groq returned empty response');

    // ── Parse sections ────────────────────────────────────────────────────────
    function extractSection(raw: string, tag: string): string {
      const regex = new RegExp(`##${tag}##([\\s\\S]*?)(?=##[A-Z_]+##|$)`);
      const match = raw.match(regex);
      return match ? match[1].trim() : '';
    }

    const simplified      = extractSection(rawResponse, 'SIMPLIFIED');
    const vocabularyRaw   = extractSection(rawResponse, 'VOCABULARY');
    const teachingTipsRaw = extractSection(rawResponse, 'TEACHING_TIPS');
    const glossaryTerms   = extractSection(rawResponse, 'GLOSSARY_TERMS');

    // ── Parse vocabulary blocks ───────────────────────────────────────────────
    const vocabEntries: { word: string; definition: string; example: string }[] = [];
    const vocabBlocks = vocabularyRaw.split('---').map((b: string) => b.trim()).filter(Boolean);
    for (const block of vocabBlocks) {
      const wordMatch = block.match(/Word:\s*(.+)/);
      const defMatch  = block.match(/Definition:\s*(.+)/);
      const exMatch   = block.match(/Example:\s*(.+)/);
      if (wordMatch && defMatch) {
        vocabEntries.push({
          word:       wordMatch[1].trim(),
          definition: defMatch[1].trim(),
          example:    exMatch?.[1]?.trim() ?? '',
        });
      }
    }

    // ── Parse teaching tips ───────────────────────────────────────────────────
    const tips = teachingTipsRaw
      .split('\n')
      .map((l: string) => l.replace(/^\d+\.\s*/, '').trim())
      .filter((l: string) => l.length > 10);

    // ── Translate glossary via Google Translate ───────────────────────────────
    let bilingualGlossary: { term: string; translation: string }[] = [];
    if (GOOGLE_KEY && glossaryTerms) {
      try {
        const terms = glossaryTerms
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean)
          .slice(0, 8);

        console.log(`Translating ${terms.length} glossary terms to ${languageCode}...`);

        const googleRes = await fetch(
          `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: terms,
              target: languageCode,
              source: 'en',
              format: 'text',
            }),
          }
        );

        if (googleRes.ok) {
          const googleData   = await googleRes.json();
          const translations = googleData?.data?.translations ?? [];
          bilingualGlossary  = terms.map((term: string, i: number) => ({
            term,
            translation: translations[i]?.translatedText ?? term,
          }));
          console.log('Glossary translated successfully');
        }
      } catch (glossaryErr) {
        console.error('Glossary translation failed (non-fatal):', glossaryErr);
      }
    }

    // ── Log to Supabase for analytics ─────────────────────────────────────────
    if (resourceId && userId && SUPABASE_URL && SUPABASE_KEY) {
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.0');
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        await supabase.from('eal_adaptations').insert({
          resource_id:   resourceId,
          created_by:    userId,
          language:      language,
          language_code: languageCode,
          subject:       subject ?? null,
          year_group:    yearGroup ?? null,
          created_at:    new Date().toISOString(),
        });
      } catch (dbErr) {
        console.error('DB log failed (non-fatal):', dbErr);
      }
    }

    console.log('EAL adaptation complete!');

    return new Response(
      JSON.stringify({
        success:          true,
        simplified,
        vocabulary:       vocabEntries,
        teachingTips:     tips,
        bilingualGlossary,
        language,
        subject:          subject ?? null,
        yearGroup:        yearGroup ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('EAL Adapter error:', err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});