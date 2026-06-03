import { defineType, defineField } from 'sanity'

export const collection = defineType({
  name: 'collection',
  title: 'Collection',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: Rule => Rule.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' }, validation: Rule => Rule.required() }),
    defineField({ name: 'description', type: 'text', rows: 3 }),
    defineField({ name: 'coverPhoto', type: 'reference', to: [{ type: 'photo' }] }),
  ],
  preview: {
    select: { title: 'title', media: 'coverPhoto.image' },
  },
})
