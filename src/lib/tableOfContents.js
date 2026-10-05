export const defaultTableOfContentsRows = [
  {
    id: 'ongoing',
    title: 'Statement of Ongoing Government & Private Contracts',
    page: '',
    included: true,
  },
  {
    id: 'slcc',
    title: 'SLCC',
    page: '',
    included: true,
  },
  {
    id: 'nfcc',
    title: 'NFCC',
    page: '',
    included: true,
  },
  {
    id: 'technical',
    title: 'Technical Specifications',
    page: '',
    included: true,
  },
  {
    id: 'bidSecurity',
    title: 'Bid Securing Declaration',
    page: '',
    included: true,
  },
  {
    id: 'schedule',
    title: 'Schedule of Requirements / Production Delivery Schedule',
    page: '',
    included: true,
  },
  {
    id: 'manpower',
    title: 'Manpower Requirements',
    page: '',
    included: true,
  },
  {
    id: 'omnibus',
    title: 'Omnibus Sworn Statement',
    page: '',
    included: true,
  },
  {
    id: 'afterSales',
    title: 'After-Sales Service Certificate',
    page: '',
    included: true,
  },
  {
    id: 'warranty',
    title: 'Certificate of Product Warranty',
    page: '',
    included: true,
  },
  {
    id: 'bidForm',
    title: 'Bid Form',
    page: '',
    included: true,
  },
  {
    id: 'priceSchedule',
    title: 'Price Schedule for Goods',
    page: '',
    included: true,
  },
  {
    id: 'summary',
    title: 'Summary of Bid Prices',
    page: '',
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