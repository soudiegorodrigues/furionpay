-- Add DELETE policy for admins on api_monitoring_events
CREATE POLICY "Admins can delete monitoring events" 
ON public.api_monitoring_events 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));