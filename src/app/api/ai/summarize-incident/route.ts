// ============================================================
// LabLoop Enterprise — AI Incident Summarizer (With Offline Fallback)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { incident_type, description, reporter_statement } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

    if (apiKey) {
      try {
        const { Anthropic } = await import('@anthropic-ai/sdk');
        const anthropic = new Anthropic({ apiKey });

        const response = await anthropic.messages.create({
          model,
          max_tokens: 300,
          system:
            'You are LabLoop Safety Review Assistant. Summarize lab incidents in exactly 3 neutral, objective bullet sentences for facility directors. No emotional language. Conclude with recommended procedural step.',
          messages: [
            {
              role: 'user',
              content: `Type: ${incident_type}\nDescription: ${description}\nStatement: ${reporter_statement || 'N/A'}`,
            },
          ],
        });

        const textContent = response.content[0].type === 'text' ? response.content[0].text : '';

        return NextResponse.json({
          source: 'anthropic_ai',
          summary: textContent,
        });
      } catch (aiErr) {
        console.warn('Anthropic API unavailable, returning offline fallback brief:', aiErr);
      }
    }

    // Deterministic 3-line neutral fallback
    const fallbackBrief = `1. Incident classified as "₹{incident_type || 'unspecified'}" based on physical inspection.\n2. Reported anomaly: ${description.slice(0, 90)}...\n3. Recommendation: Review before/after condition photos; confirm deductible proposal with facility director.`;

    return NextResponse.json({
      source: 'fallback',
      summary: fallbackBrief,
      disclaimer: 'AI-assisted neutral summary for human supervisor review.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
