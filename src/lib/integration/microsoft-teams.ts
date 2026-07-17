// src/lib/integrations/microsoft-teams.ts
// Microsoft Teams integration — share activity links via Teams

export interface TeamsChannel {
  id: string
  displayName: string
  teamId: string
  teamDisplayName: string
}

export interface TeamsMessage {
  id: string
  webUrl: string
  createdDateTime: string
}

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0'

function authHeader(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

/** List all Teams channels the user belongs to */
export async function listChannels(
  accessToken: string,
): Promise<TeamsChannel[]> {
  // Get joined teams
  const teamsRes = await fetch(
    `${GRAPH_API_BASE}/me/joinedTeams`,
    { headers: authHeader(accessToken) },
  )
  if (!teamsRes.ok) throw new Error(`Teams API error: ${teamsRes.status}`)

  const { value: teams = [] } = await teamsRes.json()
  const channels: TeamsChannel[] = []

  for (const team of teams) {
    const chanRes = await fetch(
      `${GRAPH_API_BASE}/teams/${team.id}/channels`,
      { headers: authHeader(accessToken) },
    )
    if (!chanRes.ok) continue

    const { value: chans = [] } = await chanRes.json()
    for (const chan of chans) {
      channels.push({
        id: chan.id,
        displayName: chan.displayName,
        teamId: team.id,
        teamDisplayName: team.displayName,
      })
    }
  }

  return channels
}

/** Share an EduPlay activity link as a Teams channel message */
export async function shareActivityToTeams({
  accessToken,
  teamId,
  channelId,
  activityTitle,
  activityDescription,
  activityUrl,
  teacherName,
}: {
  accessToken: string
  teamId: string
  channelId: string
  activityTitle: string
  activityDescription: string
  activityUrl: string
  teacherName: string
}): Promise<TeamsMessage> {
  const messageBody = {
    body: {
      contentType: 'html',
      content: `
        <p><b>${teacherName}</b> shared an EduPlay activity:</p>
        <p><b>${activityTitle}</b></p>
        <p>${activityDescription}</p>
        <p><a href="${activityUrl}">▶ Play on EduPlay</a></p>
      `.trim(),
    },
  }

  const res = await fetch(
    `${GRAPH_API_BASE}/teams/${teamId}/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: authHeader(accessToken),
      body: JSON.stringify(messageBody),
    },
  )

  if (!res.ok) {
    throw new Error(`Failed to post Teams message: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  return {
    id: data.id,
    webUrl: data.webUrl,
    createdDateTime: data.createdDateTime,
  }
}

/** Generate a deep-link URL for sharing to Teams (no auth required) */
export function generateTeamsDeepLink(activityUrl: string, title: string): string {
  const encoded = encodeURIComponent(activityUrl)
  const encodedTitle = encodeURIComponent(title)
  return `https://teams.microsoft.com/share?href=${encoded}&msgText=${encodedTitle}+on+EduPlay`
}
