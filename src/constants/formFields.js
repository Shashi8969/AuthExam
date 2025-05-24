export const formFields = [
  {
    label: 'Name',
    name: 'name',
    type: 'text',
    required: true,
  },
  {
    label: 'Phone Number',
    name: 'phoneNo',
    type: 'tel',
    required: true,
    pattern: '^[0-9]{10}$',
    title: 'Please enter a valid 10-digit phone number.',
  },
  {
    label: 'Aadhar Number',
    name: 'addharNo',
    type: 'number',
    required: true,
    pattern: '^[0-9]{12}$',
    title: 'Please enter a valid 12-digit Aadhar number.',
  },
  {
    label: 'Address',
    name: 'address',
    type: 'select', // Changed from 'text' to 'select'
    required: true,
    options: [ // Added city options
      { value: '', label: 'Select a City' },
      { value: 'Muzaffarpur', label: 'Muzaffarpur' },
      { value: 'Hajipur', label: 'Hajipur' },
      { value: 'Darbhanga', label: 'Darbhanga' },
      { value: 'Patna', label: 'Patna' },
      { value: 'Gaya', label: 'Gaya' },
      // Add more cities as needed
    ],
  },
  {
    label: 'Reference Name',
    name: 'referenceName',
    type: 'select',
    required: true,
    options: [{ value: '', label: 'Loading references...' }],
  },
];