// src/app/api/integrations/lms-export/route.ts
// Exports activity data in LTI 1.3 / IMS Common Cartridge format

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

interface LTIActivity {
  '@context': string
  type: string
  id: string
  name: string
  description: string
  url: string
  educationalLevel?: string
  subject?: string
  inLanguage: string
  provider: {
    '@type': string
    name: string
    url: string
  }
}

function buildLTIExport(activity: Record<string, unknown>): LTIActivity {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay-self.vercel.app'
  return {
    '@context': 'https://schema.org',
    type: 'EducationalActivity',
    id: `${baseUrl}/activity/${activity.id}`,
    name: activity.title as string,
    description: (activity.description as string) ?? '',
    url: `${baseUrl}/activity/${activity.id}/play`,
    educationalLevel: (activity.grade_label as string) ?? undefined,
    subject: (activity.subject_name as string) ?? undefined,
    inLanguage: (activity.locale as string) ?? 'en',
    provider: {
      '@type': 'EducationalOrganization',
      name: 'EduPlay',
      url: baseUrl,
    },
  }
}

function buildCommonCartridgeXML(activity: Record<string, unknown>): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay-self.vercel.app'
  const activityUrl = `${baseUrl}/activity/${activity.id}/play`

  return `<?xml version="1.0" encoding="UTF-8"?>
<cartridge_basiclti_link
  xmlns="http://www.imsglobal.org/xsd/imslticc_v1p0"
  xmlns:blti="http://www.imsglobal.org/xsd/imsbasiclti_v1p0"
  xmlns:lticm="http://www.imsglobal.org/xsd/imslticm_v1p0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <blti:title>${escapeXml(activity.title as string)}</blti:title>
  <blti:description>${escapeXml((activity.description as string) ?? '')}</blti:description>
  <blti:launch_url>${escapeXml(activityUrl)}</blti:launch_url>
  <blti:vendor>
    <lticm:property name="name">EduPlay</lticm:property>
    <lticm:property name="url">${baseUrl}</lticm:property>
  </blti:vendor>
  <blti:custom>
    <lticm:property name="activity_id">${activity.id}</lticm:property>
    <lticm:property name="activity_type">${activity.type_slug ?? ''}</lticm:property>
    <lticm:property name="locale">${activity.locale ?? 'en'}</lticm:property>
  </blti:custom>
</cartridge_basiclti_link>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const activityId = searchParams.get('activityId')
  const format = searchParams.get('format') ?? 'json-ld'

  if (!activityId) {
    return NextResponse.json({ error: 'activityId is required' }, { status: 400 })
  }

  const { data: activity, error } = await supabase
    .from('activities')
    .select(`
      id, title, description, locale, teacher_id,
      subjects(name_en),
      grades(label_en),
      activity_types(slug)
    `)
    .eq('id', activityId)
    .single()

  if (error || !activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
  }

  // Flatten joins
  const flat = {
    ...activity,
    subject_name: (activity.subjects as unknown as Record<string, string> | null)?.name_en,
    grade_label: (activity.grades as unknown as Record<string, string> | null)?.label_en,
    type_slug: (activity.activity_types as unknown as Record<string, string> | null)?.slug,
  }

  if (format === 'lti-xml') {
    const xml = buildCommonCartridgeXML(flat)
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="eduplay-activity-${activityId}.xml"`,
      },
    })
  }

  // Default: JSON-LD / schema.org
  const jsonLd = buildLTIExport(flat)
  return NextResponse.json(jsonLd)
}
