-- Add diagram type and UML/Flowchart data columns to erd_diagrams
-- Add diagram_type column to distinguish diagram modes
ALTER TABLE public.erd_diagrams 
ADD COLUMN IF NOT EXISTS diagram_type text NOT NULL DEFAULT 'erd';

-- Add UML Class Diagram data columns
ALTER TABLE public.erd_diagrams 
ADD COLUMN IF NOT EXISTS uml_classes jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.erd_diagrams 
ADD COLUMN IF NOT EXISTS uml_relations jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add Flowchart data columns
ALTER TABLE public.erd_diagrams 
ADD COLUMN IF NOT EXISTS flowchart_nodes jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.erd_diagrams 
ADD COLUMN IF NOT EXISTS flowchart_connections jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add Sequence Diagram data columns (for future expansion)
ALTER TABLE public.erd_diagrams 
ADD COLUMN IF NOT EXISTS sequence_participants jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.erd_diagrams 
ADD COLUMN IF NOT EXISTS sequence_messages jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Create index on diagram_type for filtering
CREATE INDEX IF NOT EXISTS idx_erd_diagrams_type ON public.erd_diagrams(diagram_type);

-- Add comment for documentation
COMMENT ON COLUMN public.erd_diagrams.diagram_type IS 'Type of diagram: erd, uml-class, flowchart, sequence';