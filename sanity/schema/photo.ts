import { defineType, defineField, defineArrayMember } from 'sanity'
import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list'

export const photo = defineType({
  name: 'photo',
  title: 'Photo',
  type: 'document',
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({ type: 'photo' }),
    defineField({
      name: 'title',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'image',
      type: 'image',
      options: { hotspot: true },
      validation: Rule => Rule.required(),
    }),
    defineField({ name: 'description', type: 'text', rows: 3 }),
    defineField({ name: 'location', type: 'string' }),
    defineField({
      name: 'collections',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'collection' }] })],
    }),
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
    defineField({ name: 'forSale', type: 'boolean', initialValue: false }),
    defineField({ name: 'editionSize', type: 'number', description: 'Leave blank for open edition' }),
    defineField({ name: 'editionSold', type: 'number', initialValue: 0, readOnly: true }),
    defineField({
      name: 'variants',
      title: 'Print Variants',
      type: 'array',
      of: [defineArrayMember({
        type: 'object',
        fields: [
          defineField({ name: 'size', type: 'string', options: { list: ['A4', 'A3', 'A2', 'A1'] }, validation: Rule => Rule.required() }),
          defineField({ name: 'frame', type: 'string', options: { list: ['Unframed', 'Black', 'White', 'Natural'] }, validation: Rule => Rule.required() }),
          defineField({ name: 'price', type: 'number', description: 'Price in pence (e.g. 4500 = £45.00)', validation: Rule => Rule.required().min(1) }),
          defineField({ name: 'stripePriceId', type: 'string', validation: Rule => Rule.required() }),
        ],
        preview: {
          select: { title: 'size', subtitle: 'frame', price: 'price' },
          prepare({ title, subtitle, price }) {
            return { title: `${title} · ${subtitle}`, subtitle: `£${(price / 100).toFixed(2)}` }
          },
        },
      })],
    }),
    defineField({
      name: 'mockupImages',
      title: 'Room Mockup Images',
      type: 'array',
      of: [defineArrayMember({ type: 'image', options: { hotspot: true } })],
      description: 'Optional lifestyle photos showing the print in a room',
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'location', media: 'image' },
  },
})
