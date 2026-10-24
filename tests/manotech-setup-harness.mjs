import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import DocumentSetup from '../src/components/DocumentSetup.jsx'

export function mountSetup() {
  function Harness() {
    const [value, setValue] = useState({ bidderId: 'mikata', bidderName: 'MIKATA CORPORATION',
      businessAddress: 'Mikata original office', submittedBy: 'CARLOS RAFAEL A. JAMILO', phone: 'Mikata original phone' })
    return React.createElement(DocumentSetup, { value, onChange: next => { window.testSetup = next; setValue(next) } })
  }
  createRoot(document.getElementById('root')).render(React.createElement(Harness))
}
