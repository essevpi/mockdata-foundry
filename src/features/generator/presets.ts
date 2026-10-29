import type { FieldDefinition } from '../../lib/generation';

export type PresetId = 'customers' | 'orders' | 'employees';

export type Preset = {
  id: PresetId;
  label: string;
  description: string;
  // Text, like the record count input.
  recordCount: string;
  fields: FieldDefinition[];
};

export const PRESETS: readonly Preset[] = [
  {
    id: 'customers',
    label: 'Customers',
    description:
      'Customers of a European online homeware shop, with a mix of new and long-standing accounts, varied countries and realistic contact details.',
    recordCount: '10',
    fields: [
      {
        name: 'customerId',
        type: 'string',
        nullable: false,
        guidance: 'CUS- followed by six digits',
      },
      { name: 'fullName', type: 'string', nullable: false },
      {
        name: 'email',
        type: 'string',
        nullable: false,
        guidance: 'Lowercase, based on the full name, varied domains',
      },
      { name: 'phone', type: 'string', nullable: true, guidance: 'International format' },
      {
        name: 'country',
        type: 'string',
        nullable: false,
        guidance: 'ISO 3166-1 alpha-2 code, European countries',
      },
      {
        name: 'signupDate',
        type: 'string',
        nullable: false,
        guidance: 'ISO 8601 date between 2019 and 2025',
      },
      {
        name: 'lifetimeValue',
        type: 'number',
        nullable: false,
        guidance: 'Euros with two decimals, from 0 to 5000',
      },
      { name: 'newsletterOptIn', type: 'boolean', nullable: false },
    ],
  },
  {
    id: 'orders',
    label: 'Orders',
    description:
      'Orders placed in an online electronics store over the last three months, covering every stage from payment to refund.',
    recordCount: '20',
    fields: [
      {
        name: 'orderId',
        type: 'string',
        nullable: false,
        guidance: 'ORD- followed by eight digits',
      },
      { name: 'customerEmail', type: 'string', nullable: false },
      {
        name: 'orderDate',
        type: 'string',
        nullable: false,
        guidance: 'ISO 8601 date-time in UTC',
      },
      {
        name: 'status',
        type: 'string',
        nullable: false,
        guidance: 'One of pending, paid, shipped, delivered or refunded',
      },
      { name: 'itemCount', type: 'integer', nullable: false, guidance: 'Between 1 and 6' },
      {
        name: 'totalAmount',
        type: 'number',
        nullable: false,
        guidance: 'Euros with two decimals, consistent with the item count',
      },
      {
        name: 'couponCode',
        type: 'string',
        nullable: true,
        guidance: 'Short uppercase code; null for most orders',
      },
      { name: 'isGift', type: 'boolean', nullable: false },
    ],
  },
  {
    id: 'employees',
    label: 'Employees',
    description:
      'Employees of a 200-person software company with offices in Milan and Berlin, spread across departments and seniority levels.',
    recordCount: '15',
    fields: [
      {
        name: 'employeeId',
        type: 'string',
        nullable: false,
        guidance: 'EMP- followed by four digits',
      },
      { name: 'fullName', type: 'string', nullable: false },
      {
        name: 'department',
        type: 'string',
        nullable: false,
        guidance: 'Engineering, Sales, Marketing, Finance, Operations or People',
      },
      { name: 'jobTitle', type: 'string', nullable: false },
      {
        name: 'startDate',
        type: 'string',
        nullable: false,
        guidance: 'ISO 8601 date between 2015 and 2025',
      },
      {
        name: 'annualSalary',
        type: 'integer',
        nullable: false,
        guidance: 'Gross euros, 35000 to 140000, consistent with the job title',
      },
      {
        name: 'managerId',
        type: 'string',
        nullable: true,
        guidance: "Another employee's id; null for department heads",
      },
      { name: 'isRemote', type: 'boolean', nullable: false },
    ],
  },
];
