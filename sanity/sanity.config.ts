import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list'
import { schemaTypes } from './schema'

export default defineConfig({
  name: 'archive-one',
  title: 'Archive One',
  basePath: '/studio',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  plugins: [
    structureTool({
      structure: (S, context) =>
        S.list()
          .title('Content')
          .items([
            orderableDocumentListDeskItem({
              type: 'photo',
              title: 'Photos',
              S,
              context,
            }),
            S.documentTypeListItem('collection').title('Collections'),
          ]),
    }),
    visionTool(),
  ],
  schema: { types: schemaTypes },
})
