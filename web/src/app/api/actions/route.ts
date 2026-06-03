// web/src/app/api/actions/route.ts
// Updated to track token consumption after each Claude call

import { requireAuth } from '@/lib/auth';
import { createUserClient } from '@/lib/supabase';
import { NextRequest } from 'next/server';

const TOKEN_RATE_USD = 0.0000041; // $4.08 per 1M tokens (Claude Sonnet)

export async function GET(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>['user']
  let accessToken: string

  try {
    ;({ user, accessToken } = await requireAuth(req))
  } catch (response) {
    return response as Response
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const supabase = createUserClient(accessToken);

  try {
    const { data: actions, error: actionsError } = await supabase
      .from('actions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (actionsError) throw actionsError;

    const { count, error: countError } = await supabase
      .from('actions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) throw countError;

    return Response.json({
      success: true,
      data: actions,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/actions error:', error);
    return Response.json({ error: 'Failed to fetch actions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>['user']
  let accessToken: string

  try {
    ;({ user, accessToken } = await requireAuth(req))
  } catch (response) {
    return response as Response
  }

  const supabase = createUserClient(accessToken);

  try {
    const body = await req.json();
    const {
      action_id,
      action_type,
      input_tokens = 0,
      output_tokens = 0,
      model = 'claude-sonnet-4-6',
      status = 'success',
      result,
      error: errorMsg,
    } = body;

    if (!action_type) {
      return Response.json({ error: 'action_type is required' }, { status: 400 });
    }

    const total_tokens = input_tokens + output_tokens;
    const cost_usd = total_tokens * TOKEN_RATE_USD;

    // 1. Create token_usage record
    const { data: tokenUsage, error: tokenError } = await supabase
      .from('token_usage')
      .insert({
        user_id: user.id,
        action_id: action_id || null,
        input_tokens,
        output_tokens,
        total_tokens,
        cost_usd,
        action_type,
        model,
      })
      .select()
      .single();

    if (tokenError) throw tokenError;

    // 2. Update user totals
    const { error: incrementError } = await supabase.rpc('increment_user_tokens', {
      user_id: user.id,
      tokens_count: total_tokens,
      cost: cost_usd,
    });

    if (incrementError) throw incrementError;

    // 3. Update the action record (if action_id provided)
    if (action_id) {
      const { error: updateError } = await supabase
        .from('actions')
        .update({
          status,
          result: result || null,
          error: errorMsg || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', action_id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    }

    return Response.json({
      success: true,
      data: {
        token_usage_id: tokenUsage.id,
        total_tokens,
        cost_usd,
        input_tokens,
        output_tokens,
      },
    });
  } catch (error) {
    console.error('POST /api/actions error:', error);
    return Response.json({ error: 'Failed to save action and tokens' }, { status: 500 });
  }
}
