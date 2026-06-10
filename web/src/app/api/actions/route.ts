// web/src/app/api/actions/route.ts

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
      // Fields sent by Electron syncActionHistory
      action_type,
      action_label,
      context_app,
      context_folder,
      conversation_id,
      status = 'done',
      // Optional token fields (future use)
      input_tokens = 0,
      output_tokens = 0,
      model = 'claude-sonnet-4-6',
    } = body;

    if (!action_type) {
      return Response.json({ error: 'action_type is required' }, { status: 400 });
    }

    // Map incoming status values to what the DB constraint expects
    const statusMap: Record<string, string> = {
      done:    'completed',
      success: 'completed',
      error:   'failed',
    }
    const dbStatus = statusMap[status] ?? status

    // 1. Insert into actions table — this is what feeds History + Analytics
    const { data: action, error: actionError } = await supabase
      .from('actions')
      .insert({
        user_id:         user.id,
        action_type,
        action_label:    action_label    || action_type,
        context_app:     context_app     || null,
        context_folder:  context_folder  || null,
        conversation_id: conversation_id || null,
        status: dbStatus,
      })
      .select()
      .single();

    if (actionError) throw actionError;

    // 2. Track tokens if provided (non-zero)
    const total_tokens = input_tokens + output_tokens;
    if (total_tokens > 0) {
      const cost_usd = total_tokens * TOKEN_RATE_USD;

      await supabase.from('token_usage').insert({
        user_id:      user.id,
        action_id:    action.id,
        input_tokens,
        output_tokens,
        total_tokens,
        cost_usd,
        action_type,
        model,
      });

      await supabase.rpc('increment_user_tokens', {
        user_id:      user.id,
        tokens_count: total_tokens,
        cost:         cost_usd,
      });
    }

    return Response.json({ success: true, data: { action_id: action.id } });

  } catch (error) {
    console.error('POST /api/actions error:', error);
    return Response.json({ error: 'Failed to save action' }, { status: 500 });
  }
}
