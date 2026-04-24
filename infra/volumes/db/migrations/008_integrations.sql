-- 008_integrations.sql
-- Shopify and WooCommerce store connection credentials.
-- Tokens stored encrypted at rest (Supabase handles column encryption via pg_crypto if enabled).

CREATE TABLE IF NOT EXISTS public.shopify_connections (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain  TEXT        NOT NULL,  -- e.g. my-store.myshopify.com
  access_token TEXT        NOT NULL,  -- Shopify offline access token
  scopes       TEXT[]      NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, shop_domain)
);

CREATE TABLE IF NOT EXISTS public.woocommerce_connections (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_url     TEXT        NOT NULL,  -- e.g. https://mystore.com
  consumer_key  TEXT        NOT NULL,
  consumer_secret TEXT      NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, store_url)
);

ALTER TABLE public.shopify_connections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopify_connections: owner only" ON public.shopify_connections;
CREATE POLICY "shopify_connections: owner only"
  ON public.shopify_connections FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "woocommerce_connections: owner only" ON public.woocommerce_connections;
CREATE POLICY "woocommerce_connections: owner only"
  ON public.woocommerce_connections FOR ALL USING (auth.uid() = user_id);
