import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sfgjpefqqqjgpwjvarru.supabase.co'
const supabaseKey = 'sb_publishable_y68Sg8CKhP-jGi1lrLiNFw_LsOfP7sI'

export const supabase = createClient(supabaseUrl, supabaseKey)