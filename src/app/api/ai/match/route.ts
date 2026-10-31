// ============================================================
// LabLoop Enterprise — AI Smart Match Route (With Deterministic Fallback)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { need } = await req.json();

    if (!need || typeof need !== 'string') {
      return NextResponse.json({ error: 'Missing need description' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

    if (apiKey) {
      try {
        const { Anthropic } = await import('@anthropic-ai/sdk');
        const anthropic = new Anthropic({ apiKey });

        const response = await anthropic.messages.create({
          model,
          max_tokens: 600,
          system:
            'You are LabLoop Campus AI Matcher. Analyze student lab fabrication needs and recommend suitable equipment. Return valid JSON only.',
          messages: [
            {
              role: 'user',
              content: `Recommend equipment for: "₹{need}". Available equipment: 
              1. Industrial Laser Cutter 500W (id: res-laser, wood/acrylic/cutting, req: badge-laser_safety_l2, tier 1)
              2. Monomer 3D Printer (id: res-3dprint, carbon fiber/PEEK/PLA, tier 0)
              3. Bio-Inoculation Incubator (id: res-bio, cell culture/enzymes, req: badge-biosafety_l1, tier 2)
              4. Digital Oscilloscope (id: res-scope, circuits/electronics, tier 0)
              
              Output format:
              {
                "recommended_resource_id": "res-laser",
                "resource_name": "Industrial Laser Cutter 500W",
                "fit_reason": "Explanation of why this matches",
                "missing_requirements": ["Laser Safety Level 2 Badge"]
              }`,
            },
          ],
        });

        const textContent = response.content[0].type === 'text' ? response.content[0].text : '';
        const parsed = JSON.parse(textContent);

        return NextResponse.json({
          source: 'anthropic_ai',
          model,
          ...parsed,
        });
      } catch (aiErr) {
        console.warn('Anthropic API call failed or timed out, using deterministic fallback:', aiErr);
      }
    }

    // Deterministic Offline Fallback
    const lower = need.toLowerCase();
    let matchId = 'res-3dprint';
    let matchName = 'Monomer Multi-Material 3D Printer';
    let fitReason = 'Rapid additive manufacturing suitable for custom structural geometry.';
    let missingReqs: string[] = [];

    if (lower.includes('cut') || lower.includes('laser') || lower.includes('wood') || lower.includes('acrylic')) {
      matchId = 'res-laser';
      matchName = 'Industrial Laser Cutter 500W';
      fitReason = 'High-speed 500W CO2 beam optimized for precision 2D sheet profile cutting and acrylic etching.';
      missingReqs = ['Laser Safety Level 2 Badge'];
    } else if (lower.includes('cell') || lower.includes('bio') || lower.includes('bacteria') || lower.includes('culture')) {
      matchId = 'res-bio';
      matchName = 'Bio-Inoculation Incubator & Shaker';
      fitReason = 'Temperature-regulated CO2 chamber with orbital agitation for microbial protocols.';
      missingReqs = ['Biosafety Level 1 Training', 'Trust Tier 2 Clearance'];
    } else if (lower.includes('circuit') || lower.includes('scope') || lower.includes('volt') || lower.includes('signal')) {
      matchId = 'res-scope';
      matchName = 'Digital Oscilloscope 4-Channel';
      fitReason = '1GHz real-time sampling with hardware protocol decoding for bus debugging.';
      missingReqs = [];
    }

    return NextResponse.json({
      source: 'fallback',
      recommended_resource_id: matchId,
      resource_name: matchName,
      fit_reason: fitReason,
      missing_requirements: missingReqs,
      disclaimer: 'AI-assisted suggestion. Final safety, access, and booking approval confirmed by staff.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
