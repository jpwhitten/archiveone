import { defineType, defineField, defineArrayMember } from 'sanity'

export const order = defineType({
  name: 'order',
  title: 'Order',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({ name: 'sessionId', type: 'string' }),
    defineField({ name: 'createdAt', type: 'datetime' }),
    defineField({ name: 'region', type: 'string' }),
    defineField({ name: 'customerName', type: 'string' }),
    defineField({ name: 'customerEmail', type: 'string' }),
    defineField({ name: 'shippingAddress', type: 'text' }),
    defineField({
      name: 'items',
      type: 'array',
      of: [defineArrayMember({
        type: 'object',
        fields: [
          defineField({ name: 'photoTitle', type: 'string' }),
          defineField({ name: 'size', type: 'string' }),
          defineField({ name: 'frame', type: 'string' }),
          defineField({ name: 'qty', type: 'number' }),
        ],
      })],
    }),
    defineField({ name: 'total', type: 'number', description: 'Pence' }),
    defineField({ name: 'fulfilment', type: 'string', options: { list: ['artelo', 'manual'] } }),
    defineField({ name: 'arteloOrderId', type: 'string' }),
    defineField({ name: 'status', type: 'string', options: { list: ['submitted', 'manual', 'failed'] } }),
  ],
  orderings: [{ name: 'newest', title: 'Newest', by: [{ field: 'createdAt', direction: 'desc' }] }],
  preview: {
    select: { title: 'customerName', subtitle: 'status', date: 'createdAt' },
    prepare({ title, subtitle }: { title?: string; subtitle?: string }) {
      return { title: title || 'Order', subtitle }
    },
  },
})
