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
    type: 'text',
    required: true,
    pattern: '^[0-9]{10}$',
    title: 'Please enter a valid 10-digit phone number.',
  },
  {
    label: 'Aadhar Number',
    name: 'addharNo',
    type: 'text',
    required: true,
    pattern: '^[0-9]{12}$',
    title: 'Please enter a valid 12-digit Aadhar number.',
  },
  {
    label: 'Address',
    name: 'address',
    type: 'text',
    required: true,
  },
  {
    label: 'Reference Name',
    name: 'referenceName',
    type: 'select',
    required: true,
    options: [{ value: '', label: 'Loading references...' }],
  },
];