import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create regular client for user verification
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: req.headers.get('Authorization')!,
          },
        },
      }
    );

    const { targetUserId, resetReason } = await req.json();

    // Get the current user ID from the regular client
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify the requesting user is a super admin using service role client (bypasses RLS)
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .select('admin_role')
      .eq('user_id', userData.user.id)
      .single();

    if (adminError || !adminData || adminData.admin_role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Insufficient privileges - super admin required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get target user's email from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', targetUserId)
      .single();

    if (profileError || !profileData) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user email from auth.users
    const { data: targetUserData, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(profileData.user_id);

    if (targetUserError || !targetUserData.user?.email) {
      return new Response(
        JSON.stringify({ error: 'Failed to get user email' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate password reset for the target user
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: targetUserData.user.email,
    });

    if (resetError) {
      console.error('Password reset error:', resetError);
      return new Response(
        JSON.stringify({ error: 'Failed to initiate password reset' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log the password reset action (this should already work from the existing RPC)
    await supabase.rpc('admin_reset_user_password', {
      target_user_id: targetUserId,
      reset_reason: resetReason || 'Password reset by Super Admin'
    });

    console.log(`Password reset initiated for user ${targetUserId} by admin`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset email sent successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in admin-reset-password function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});