export const interestAreas = [
  'Product updates', 'Future pilot opportunities',
  'Supporting prototype development', 'General conversation'
];

export function prepareInquiry(values) {
  const data = Object.fromEntries(['name', 'email', 'organization', 'interest', 'message']
    .map(key => [key, String(values[key] ?? '').trim()]));
  const errors = {};
  if (!data.name || data.name.length > 100) errors.name = 'Please enter a name of up to 100 characters.';
  if (!/^[^\s@]+@[^\s@]+$/.test(data.email) || data.email.length > 180) errors.email = 'Please enter a valid email address.';
  if (data.organization.length > 140) errors.organization = 'Please keep the organization under 141 characters.';
  if (!interestAreas.includes(data.interest)) errors.interest = 'Please choose an area of interest.';
  if (data.message.length > 1200) errors.message = 'Please keep your message to 1,200 characters.';
  return { data, errors, valid: Object.keys(errors).length === 0 };
}

export function formatInquiry(inquiry) {
  return `CALCULATED VISIONS — DEMO INQUIRY\n\nThis inquiry was prepared on the visitor's device. It has NOT been sent.\n\nName: ${inquiry.name}\nEmail: ${inquiry.email}\nOrganization: ${inquiry.organization || 'Not provided'}\nArea of interest: ${inquiry.interest}\n\nMessage:\n${inquiry.message || 'No additional message.'}\n\nPortable Personal Cooling Shelter · MESA Idea Accelerator 2026\nProduct in development.\n`;
}
