-- Allow users to delete their own threat logs
CREATE POLICY "Users can delete their own threat logs"
ON public.threat_logs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own rate limit hits
CREATE POLICY "Users can delete their own rate limit hits"
ON public.rate_limit_hits
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);