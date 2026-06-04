import { groq } from 'next-sanity'
import { sanityClient } from './client'
import type { Photo, Collection } from '@/lib/types'

const photoFields = groq`
  _id, title, slug, image, description, location,
  featured, forSale, editionSize, editionSold,
  variants, mockupImages,
  "collections": collections[]->{ _id, title, slug }
`

export async function getFeaturedPhotos(): Promise<Photo[]> {
  return sanityClient.fetch(
    groq`*[_type == "photo" && featured == true] | order(orderRank) [0...20] { ${photoFields} }`
  )
}

export async function getAllPhotos(): Promise<Photo[]> {
  return sanityClient.fetch(
    groq`*[_type == "photo"] | order(orderRank) { ${photoFields} }`
  )
}

export async function getPhotosByCollection(collectionSlug: string): Promise<Photo[]> {
  return sanityClient.fetch(
    groq`*[_type == "photo" && $slug in collections[]->slug.current] | order(orderRank) { ${photoFields} }`,
    { slug: collectionSlug }
  )
}

export async function getShopPhotos(): Promise<Photo[]> {
  return sanityClient.fetch(
    groq`*[_type == "photo" && forSale == true] | order(orderRank) { ${photoFields} }`
  )
}

export async function getPhotoBySlug(slug: string): Promise<Photo | null> {
  return sanityClient.fetch(
    groq`*[_type == "photo" && slug.current == $slug][0] { ${photoFields} }`,
    { slug }
  )
}

export async function getAllCollections(): Promise<Collection[]> {
  return sanityClient.fetch(
    groq`*[_type == "collection"] | order(title asc) {
      _id, title, slug, description,
      coverPhoto->{ _id, title, slug, image }
    }`
  )
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  return sanityClient.fetch(
    groq`*[_type == "collection" && slug.current == $slug][0] {
      _id, title, slug, description,
      coverPhoto->{ _id, title, slug, image }
    }`,
    { slug }
  )
}
