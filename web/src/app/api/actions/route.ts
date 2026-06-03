// web/src/app/api/actions/route.ts
// Updated to track token consumption after each Claude call

import { requireAuth } from '@/lib/auth';
import { createUserClient } from '@/lib/supabase';
import { NextRequest } from 'next/server';

const TOKEN_RATE_USD = 0.0000041; // $4.08 per 1M tokens (Claude Sonnet 3.5)

export async function GET(req: NextRequest) {
  /**
   * GET /api/actions
   * Returns paginated action history for the authenticated user
   * Query params: page=1, limit=20
   */
  const user = await requireAuth(req);
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const supabase = createUserClient(req);

  try {
    // Get paginated actions
    const { data: actions, error: actionsError } = await supabase
      .from('actions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (actionsError) throw actionsError;

    // Get total count
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
  /**
   * POST /api/actions
   * Saves action execution + token usage from Electron app
   *
   * Body:
   * {
   *   action_id?: string (optional, link to existing action)
   *   action_type: 'insert_text' | 'copy_to_clipboard' | 'open_file' | etc.
   *   input_tokens: number
   *   output_tokens: number
   *   model?: string (default: 'claude-sonnet-4-6')
   *   status: 'success' | 'error' | 'pending'
   *   result?: string (what was inserted/copied/etc)
   *   error?: string (if status === 'error')
   * }
   */
  const user = await requireAuth(req);
  const supabase = createUserClient(req);

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

    // Validate required fields
    if (!action_type) {
      return Response.json(
        { error: 'action_type is required' },
        { status: 400 }
      );
    }

    const total_tokens = input_tokens + output_tokens;
    const cost_usd = total_tokens * TOKEN_RATE_USD;

    // 1. Create token_usage record (for analytics)
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

    if (tokenError) {
      console.error('Failed to save token usage:', tokenError);
      throw tokenError;
    }

    // 2. Update user's token totals (calls Postgres function)
    const { error: incrementError } = await supabase.rpc(
      'increment_user_tokens',
      {
        user_id: user.id,
        tokens_count: total_tokens,
        cost: cost_usd,
      }
    );

    if (incrementError) {
      console.error('Failed to increment user tokens:', incrementError);
      throw incrementError;
    }

    // 3. Update the action record with token counts (if action_id provided)
    if (action_id) {
      const { error: updateError } = await supabase
        .from('actions')
        .update({
          input_tokens,
          output_tokens,
          total_tokens,
          cost_usd,
          status,
          result: result || null,
          error: errorMsg || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', action_id)
        .eq('user_id', user.id); // Ensure user can only update their own actions

      if (updateError) {
        console.error('Failed to update action:', updateError);
        throw updateError;
      }
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
    return Response.json(
      { error: 'Failed to save action and tokens' },
      { status: 500 }
    );
  }
}
