-- Monthly net sales for the Monthly Overview multi-year chart.
-- Same rules as aggregateMonthlyOverview(): Jakarta calendar month, Head Office ('HO' or containing
-- 'head office') excluded, and no days after today. Lets the page fetch 12 numbers per year instead
-- of every clean_master row for years it only charts.
CREATE OR REPLACE VIEW public.clean_master_monthly_net AS
SELECT
  extract(year  FROM transaction_date AT TIME ZONE 'Asia/Jakarta')::int AS year,
  extract(month FROM transaction_date AT TIME ZONE 'Asia/Jakarta')::int AS month,
  coalesce(sum(net_sales), 0)::numeric AS net_sales
FROM public.clean_master
WHERE transaction_date IS NOT NULL
  AND (transaction_date AT TIME ZONE 'Asia/Jakarta')::date <= (now() AT TIME ZONE 'Asia/Jakarta')::date
  AND NOT (lower(btrim(coalesce(location, ''))) LIKE '%head office%' OR lower(btrim(coalesce(location, ''))) = 'ho')
GROUP BY 1, 2;

GRANT SELECT ON public.clean_master_monthly_net TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
