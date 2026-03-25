import { createClient } from '@/lib/supabase/server'
import type { Challenge } from '@/types/database'
import ChallengesBrowser from './challenges-browser'

export default async function BrowseChallengesPage() {
  const supabase = await createClient()

  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .neq('status', 'draft')
    .order('created_at', { ascending: false })

  const typedChallenges = (challenges || []) as Challenge[]

  // Fetch brand names
  const brandIds = [...new Set(typedChallenges.map((c) => c.brand_id))]
  const { data: profiles } = brandIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', brandIds)
    : { data: [] }

  const brandMap: Record<string, string> = {}
  ;(profiles || []).forEach((p: { id: string; display_name: string }) => {
    brandMap[p.id] = p.display_name
  })

  // Fetch application counts
  const challengeIds = typedChallenges.map((c) => c.id)
  const { data: appCounts } = challengeIds.length > 0
    ? await supabase
        .from('applications')
        .select('challenge_id')
        .in('challenge_id', challengeIds)
    : { data: [] }

  const countMap: Record<string, number> = {}
  ;(appCounts || []).forEach((a: { challenge_id: string }) => {
    countMap[a.challenge_id] = (countMap[a.challenge_id] || 0) + 1
  })

  return (
    <ChallengesBrowser
      challenges={typedChallenges}
      brandMap={brandMap}
      countMap={countMap}
    />
  )
}
