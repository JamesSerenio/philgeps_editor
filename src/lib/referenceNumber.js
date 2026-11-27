export const hasReferenceNumber = value => String(value ?? '').trim().length > 0
export const includeReferenceRow = ([label, value]) => label !== 'REFERENCE NUMBER' || hasReferenceNumber(value)
