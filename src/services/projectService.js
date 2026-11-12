import { supabase } from '../supabase'

export function getBiddingProjects() {
  return supabase
    .from('philgeps_posts')
    .select('*')
    .eq('is_bidding_doc', true)
    .order('created_at', { ascending: false })
}

// Manual BDocs entries use the same editor and persistence flow as PhilGEPS
// projects, but intentionally begin without the PhilGEPS project information.
export function createBlankBiddingProject() {
  return supabase
    .from('philgeps_posts')
    .insert({
      // The existing table uses a client-supplied UUID (it has no database
      // default for id), unlike tables created by the Supabase quick-start.
      id: globalThis.crypto?.randomUUID?.(),
      is_bidding_doc: true,
      title: '',
      reference_number: '',
      procuring_entity: '',
      lgu: '',
    })
    .select('*')
    .single()
}

export function getProjectById(id) {
  return supabase
    .from('philgeps_posts')
    .select('*')
    .eq('id', id)
    .single()
}
