import { supabase } from '../supabase'

export function getBiddingProjects() {
  return supabase
    .from('philgeps_posts')
    .select('*')
    .eq('is_bidding_doc', true)
    .order('created_at', { ascending: false })
}

export function getProjectById(id) {
  return supabase
    .from('philgeps_posts')
    .select('*')
    .eq('id', id)
    .single()
}
