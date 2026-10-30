export const CATEGORIES = ['Admission', 'Scholarship', 'Events', 'Mentoring', 'Technical', 'Other'];
export const CHANNELS = ['WhatsApp', 'Phone call', 'Email', 'Form', 'In person'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const STATUSES = ['New', 'Assigned', 'In progress', 'Waiting for student', 'Resolved', 'Closed'];

export const ROLE_LABEL = {
  student: 'Student',
  anchor: 'Anchor',
  mentor: 'Mentor',
  zone: 'Zone In-charge',
  office: 'Office Team',
};

export const VISIBILITY = [
  { key: 'anchor', label: 'Anchor' },
  { key: 'mentor', label: 'Mentor' },
  { key: 'zone', label: 'Zone In-charge' },
  { key: 'office', label: 'Office Team' },
];

// a query with no update for this many hours is "overdue"
export const OVERDUE_HOURS = 48;