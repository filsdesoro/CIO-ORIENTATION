// =====================================================================
//  CIO-ORIENTATION — Fonction serveur « connexion »
//  Connexion avec un identifiant court (ex : admin.bouake) + mot de passe.
//  L'e-mail réel n'est jamais renvoyé au navigateur : la fonction retrouve
//  le compte, vérifie le mot de passe et renvoie seulement la session.
//  Un e-mail est aussi accepté à la place de l'identifiant.
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ECHEC = "Identifiant ou mot de passe incorrect.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => ({}));
    const saisie = String(body.identifiant ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!saisie || !password) return json({ error: ECHEC }, 400);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // 1. Retrouver l'e-mail du compte
    let email = saisie;
    if (!saisie.includes("@")) {
      const { data: membre } = await admin
        .from("personnel")
        .select("id")
        .eq("identifiant", saisie)
        .maybeSingle();
      if (!membre) return json({ error: ECHEC }, 400);
      const { data: compte } = await admin.auth.admin.getUserById(membre.id);
      if (!compte?.user?.email) return json({ error: ECHEC }, 400);
      email = compte.user.email;
    }

    // 2. Vérifier le mot de passe
    const client = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) return json({ error: ECHEC }, 400);

    // 3. Renvoyer uniquement la session
    return json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (_e) {
    return json({ error: "Connexion impossible pour le moment. Réessayez." }, 500);
  }
});
