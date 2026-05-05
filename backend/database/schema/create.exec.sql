-- Create exec_sql helper function for CI security enforcement
-- This function allows the CI script to execute arbitrary SQL queries

CREATE OR REPLACE FUNCTION public.exec_sql(sql_query TEXT)
RETURNS TABLE(result JSON)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE sql_query;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO service_role;
