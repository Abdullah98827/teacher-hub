const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GOOGLE_KEY    = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
    const SUPABASE_URL  = Deno.env.get('SUPABASE_URL');
    const SUPABASE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const body = await req.json();
    const { text, target_language, resource_id, user_id } = body;

    if (!text || !target_language) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text and target_language' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!GOOGLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Google Translate API key not configured in Supabase secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Always call Google Translate with the actual text typed ──────────────
    // No resource-based caching — user's typed text is always translated fresh
    const googleRes = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          target: target_language,
          source: 'en',
          format: 'text',
        }),
      }
    );

    if (!googleRes.ok) {
      const errorText = await googleRes.text();
      console.error('Google API error:', errorText);
      throw new Error(`Google Translate failed: ${errorText}`);
    }

    const googleData = await googleRes.json();
    const translated = googleData?.data?.translations?.[0]?.translatedText;

    if (!translated) {
      throw new Error('Google Translate returned no translation');
    }

    // ── Optionally log translation to Supabase for analytics ─────────────────
    // We save the translation but we NEVER use it to override what user typed
    // This is just for dissertation analytics (how many translations were made)
    if (resource_id && user_id) {
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.0');
        const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

        // Upsert so we don't get duplicate rows — just update the count
        const { data: existing } = await supabase
          .from('document_translations')
          .select('id, usage_count')
          .eq('resource_id', resource_id)
          .eq('target_language', target_language)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('document_translations')
            .update({
              usage_count: (existing.usage_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('document_translations').insert({
            resource_id,
            target_language,
            translated_content: translated,
            created_by: user_id,
            usage_count: 1,
          });
        }
      } catch (dbErr) {
        // DB logging failed — don't fail the whole request over this
        console.error('DB logging error (non-fatal):', dbErr);
      }
    }

    return new Response(
      JSON.stringify({
        translated_text: translated,
        from_cache: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Translation error:', err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});