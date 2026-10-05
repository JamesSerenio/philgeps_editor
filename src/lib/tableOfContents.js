export const defaultTableOfContentsRows = [
  {
    id: 'ongoing',
    title: 'Statement of Ongoing Government & Private Contracts',
    included: true,
  },
  {
    id: 'slcc',
    title: 'SLCC',
    included: true,
  },
  {
    id: 'nfcc',
    title: 'NFCC',
    included: true,
  },
  {
    id: 'technical',
    title: 'Technical Specifications',
    included: true,
  },
  {
    id: 'bidSecurity',
    title: 'Bid Securing Declaration',
    included: true,
  },
  {
    id: 'schedule',
    title: 'Schedule of Requirements / Production Delivery Schedule',
    included: true,
  },
  {
    id: 'manpower',
    title: 'Manpower Requirements',
    included: true,
  },
  {
    id: 'omnibus',
    title: 'Omnibus Sworn Statement',
    included: true,
  },
  {
    id: 'afterSales',
    title: 'After-Sales Service Certificate',
    included: true,
  },
  {
    id: 'warranty',
    title: 'Certificate of Product Warranty',
    included: true,
  },
  {
    id: 'bidForm',
    title: 'Bid Form',
    included: true,
  },
  {
    id: 'priceSchedule',
    title: 'Price Schedule for Goods',
    included: true,
  },
  {
    id: 'summary',
    title: 'Summary of Bid Prices',
    included: true,
  },
]

export function createInitialContentsState() {
  return {
    rows: defaultTableOfContentsRows.map((row) => ({
      ...row,
    })),
  }
}