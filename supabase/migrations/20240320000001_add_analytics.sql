-- Create analytics table
CREATE TABLE IF NOT EXISTS public.analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    metrics JSONB NOT NULL,
    ai_insights JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_business_date ON public.analytics(business_id, date DESC);

-- Create function for aggregated metrics
CREATE OR REPLACE FUNCTION public.get_aggregated_metrics(
    p_business_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_leads', SUM((metrics->>'total_leads')::numeric),
        'active_leads', SUM((metrics->>'active_leads')::numeric),
        'converted_leads', SUM((metrics->>'converted_leads')::numeric),
        'total_revenue', SUM((metrics->>'total_revenue')::numeric),
        'average_deal_size', AVG((metrics->>'average_deal_size')::numeric),
        'customer_acquisition_cost', AVG((metrics->>'customer_acquisition_cost')::numeric),
        'customer_lifetime_value', AVG((metrics->>'customer_lifetime_value')::numeric),
        'sales_by_stage', (
            SELECT jsonb_object_agg(
                key,
                SUM(value::numeric)
            )
            FROM public.analytics,
            jsonb_each_text(metrics->'sales_by_stage')
            WHERE business_id = p_business_id
            AND date BETWEEN p_start_date AND p_end_date
        )
    )
    INTO result
    FROM public.analytics
    WHERE business_id = p_business_id
    AND date BETWEEN p_start_date AND p_end_date;

    RETURN result;
END;
$$; 