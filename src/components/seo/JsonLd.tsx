/**
 * JsonLd — injects a <script type="application/ld+json"> block into the page.
 * Accepts any plain JSON-LD object or array of objects.
 * Usage: <JsonLd data={generateActivitySchema(activity)} />
 */

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[]
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is server-controlled, not user input
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
