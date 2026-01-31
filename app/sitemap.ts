import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  // ⚠️ CHANGE THIS if you buy a domain later.
  // For now, use your Vercel URL.
  const baseUrl = 'https://tag-tool-six.vercel.app' 

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    // If you have a pricing page, add it here:
    // {
    //   url: `${baseUrl}/pricing`,
    //   lastModified: new Date(),
    //   changeFrequency: 'monthly',
    //   priority: 0.8,
    // },
  ]
}