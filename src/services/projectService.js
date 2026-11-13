
import { supabase } from '../supabase'

// =============================================
// GET ALL BIDDING DOCUMENT PROJECTS
// =============================================

export function getBiddingProjects() {
  return supabase
    .from('philgeps_posts')
    .select('*')
    .eq('is_bidding_doc', true)
    .order('created_at', {
      ascending: false,
    })
}

// =============================================
// CREATE NEW BLANK EDITOR PROJECT
// =============================================

// Manual BDocs entries use the same editor
// and persistence flow as PhilGEPS projects.
//
// New Blank Editor projects are identified
// using is_manual = true.
//
// The Closing / Deadline is date-only and
// will be filled in by the user.
//
// Do not automatically create a deadline.

export function createBlankBiddingProject() {
  return supabase
    .from('philgeps_posts')
    .insert({
      // Unique ID for the new blank project.
      id: globalThis.crypto.randomUUID(),

      // Include the project in Bidding Documents.
      is_bidding_doc: true,

      // Identify this as a manually created project.
      is_manual: true,

      // Date-only deadline, initially empty.
      manual_deadline: null,

      // User will enter project information.
      title: '',
      reference_number: '',
      procuring_entity: '',
      lgu: '',
    })
    .select('*')
    .single()
}

// =============================================
// GET PROJECT BY ID
// =============================================

export function getProjectById(id) {
  return supabase
    .from('philgeps_posts')
    .select('*')
    .eq('id', id)
    .single()
}

// =============================================
// UPDATE MANUAL PROJECT INFORMATION
// =============================================

// Call this from the existing editor autosave
// for a project already identified as manual.
//
// Preserve the selected calendar date as
// YYYY-MM-DD without inventing a time.

export function updateManualBiddingProject(
  id,
  setup,
) {
  const deadline = String(
    setup.closingDate ?? '',
  ).slice(0, 10)

  const validDeadline =
    /^\d{4}-\d{2}-\d{2}$/.test(deadline)
      ? deadline
      : null

  return supabase
    .from('philgeps_posts')
    .update({
      title: setup.projectTitle ?? '',
      reference_number:
        setup.referenceNumber ?? '',
      procuring_entity:
        setup.procuringEntity ?? '',
      lgu: setup.municipality ?? '',
      area_of_delivery:
        setup.province ?? '',

      // Persist manual project identity.
      is_manual: true,

      // Date only, without hours or minutes.
      manual_deadline: validDeadline,
    })
    .eq('id', id)
    .eq('is_manual', true)
    .select('*')
    .single()
}
