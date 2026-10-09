// =====================================================================
//  CIO-ORIENTATION — Fonction serveur « creer-membre »
//  Permet à l'administrateur d'un CIO de créer le compte d'un
//  conseiller ou d'un point focal, sans ouvrir les inscriptions publiques.
//
//  Déploiement : Supabase → Edge Functions → Deploy a new function
//  → nom « creer-membre » → coller ce fichier → Deploy.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // 1. Qui appelle ?
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (!caller) return json({ error: "Vous devez être connecté" }, 401);

    const admin = createClient(url, serviceKey);

    // 2. L'appelant doit être admin actif d'un CIO
    const { data: me } = await admin
      .from("personnel")
      .select("cio_id, role, actif")
      .eq("id", caller.id)
      .maybeSingle();
    if (!me || me.role !== "admin_cio" || !me.actif) {
      return json({ error: "Action réservée à l'administrateur du CIO" }, 403);
    }

    // 3. Contrôle des données
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const nom = String(body.nom ?? "").trim();
    const prenoms = String(body.prenoms ?? "").trim() || null;
    const telephone = String(body.telephone ?? "").trim() || null;
    const role = String(body.role ?? "");
    const etablissementId = body.etablissement_id || null;
    const etablissements: string[] = Array.isArray(body.etablissements) ? body.etablissements : [];

    if (!email.includes("@")) return json({ error: "Adresse e-mail invalide" }, 400);
    if (password.length < 8) return json({ error: "Le mot de passe doit contenir au moins 8 caractères" }, 400);
    if (!nom) return json({ error: "Le nom est obligatoire" }, 400);
    if (!["admin_cio", "conseiller", "point_focal"].includes(role)) {
      return json({ error: "Rôle invalide" }, 400);
    }

    // Les établissements indiqués doivent appartenir au CIO de l'admin
    const aVerifier = [...etablissements, ...(etablissementId ? [etablissementId] : [])];
    if (aVerifier.length > 0) {
      const { data: etabs } = await admin
        .from("etablissements")
        .select("id")
        .eq("cio_id", me.cio_id)
        .in("id", aVerifier);
      if ((etabs ?? []).length !== new Set(aVerifier).size) {
        return json({ error: "Un des établissements n'appartient pas à votre CIO" }, 400);
      }
    }
    if (role === "point_focal" && !etablissementId) {
      return json({ error: "Un point focal doit être rattaché à un établissement" }, 400);
    }

    // 4. Création du compte de connexion
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created?.user) {
      const msg = createError?.message ?? "Création du compte impossible";
      return json({ error: msg.includes("already") ? "Un compte existe déjà avec cet e-mail" : msg }, 400);
    }
    const newId = created.user.id;

    // 5. Fiche personnel
    const { error: persError } = await admin.from("personnel").insert({
      id: newId,
      cio_id: me.cio_id,
      etablissement_id: role === "point_focal" ? etablissementId : null,
      nom,
      prenoms,
      role,
      telephone,
      email,
    });
    if (persError) {
      await admin.auth.admin.deleteUser(newId);
      return json({ error: persError.message }, 400);
    }

    // 6. Affectations du conseiller
    if (role === "conseiller" && etablissements.length > 0) {
      const { error: affError } = await admin
        .from("conseiller_etablissements")
        .insert(etablissements.map((id) => ({ conseiller_id: newId, etablissement_id: id })));
      if (affError) return json({ id: newId, avertissement: affError.message });
    }

    return json({ id: newId });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
