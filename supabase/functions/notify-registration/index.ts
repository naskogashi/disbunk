const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin via getClaims
    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2"
    );
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const adminId = claimsData.claims.sub;

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { userId, approved } = await req.json();

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .single();

    const userName = profile?.full_name || "Unknown user";
    const action = approved ? "approved" : "rejected";

    // Log the audit action
    const serviceClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await serviceClient.from("audit_logs").insert({
      admin_id: adminId,
      action: `registration_${action}`,
      target_type: "user",
      target_id: userId,
      metadata: { user_name: userName },
    });

    // Create notification for the user
    await serviceClient.from("notifications").insert({
      user_id: userId,
      type: "registration",
      payload: {
        action,
        message: approved
          ? "Your account has been approved. Welcome to Disbunk!"
          : "Your account registration has been rejected.",
      },
    });

    // In production, integrate with SendGrid or similar for email to info@disbunk.org
    // For now, log the event
    console.log(
      `Registration ${action}: ${userName} (${userId}) by admin ${adminId}`
    );

    return new Response(
      JSON.stringify({ success: true, action, userName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
