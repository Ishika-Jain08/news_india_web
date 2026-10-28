export const LANGUAGES = ['en', 'hi'] as const
export const ROLES = ['admin', 'editor', 'reporter'] as const
export const ARTICLE_STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'published'] as const
export const COVERAGE_LEVELS = ['local', 'state', 'national'] as const
export const SCHEMA_VERSION = 1 as const

export const DEMO_ACCOUNTS = [
  {
    role: 'admin',
    email: 'admin@newsindia.example',
    password: 'Admin@12345',
    name: 'Newsroom Admin',
    nameHi: 'न्यूज़रूम व्यवस्थापक',
  },
  {
    role: 'editor',
    email: 'editor@newsindia.example',
    password: 'Editor@12345',
    name: 'Rahul Mehta',
    nameHi: 'राहुल मेहता',
  },
  {
    role: 'reporter',
    email: 'reporter@newsindia.example',
    password: 'Reporter@12345',
    name: 'Ananya Iyer',
    nameHi: 'अनन्या अय्यर',
  },
] as const

/** Trending score used by the API. Membership is calculated, not read from a static list. */
export const TRENDING_RULE =
  'score = viewCount + trendingBoost + (breaking ? 40 : 0) + max(0, 10 - fullDaysSincePublished) * 8. Only published articles are ranked. Ties break by publishedAt descending, then id.'

export const INDIAN_STATES: { en: string; hi: string }[] = [
  { en: 'Andhra Pradesh', hi: 'आंध्र प्रदेश' },
  { en: 'Arunachal Pradesh', hi: 'अरुणाचल प्रदेश' },
  { en: 'Assam', hi: 'असम' },
  { en: 'Bihar', hi: 'बिहार' },
  { en: 'Chhattisgarh', hi: 'छत्तीसगढ़' },
  { en: 'Goa', hi: 'गोवा' },
  { en: 'Gujarat', hi: 'गुजरात' },
  { en: 'Haryana', hi: 'हरियाणा' },
  { en: 'Himachal Pradesh', hi: 'हिमाचल प्रदेश' },
  { en: 'Jharkhand', hi: 'झारखंड' },
  { en: 'Karnataka', hi: 'कर्नाटक' },
  { en: 'Kerala', hi: 'केरल' },
  { en: 'Madhya Pradesh', hi: 'मध्य प्रदेश' },
  { en: 'Maharashtra', hi: 'महाराष्ट्र' },
  { en: 'Manipur', hi: 'मणिपुर' },
  { en: 'Meghalaya', hi: 'मेघालय' },
  { en: 'Mizoram', hi: 'मिज़ोरम' },
  { en: 'Nagaland', hi: 'नागालैंड' },
  { en: 'Odisha', hi: 'ओडिशा' },
  { en: 'Punjab', hi: 'पंजाब' },
  { en: 'Rajasthan', hi: 'राजस्थान' },
  { en: 'Sikkim', hi: 'सिक्किम' },
  { en: 'Tamil Nadu', hi: 'तमिलनाडु' },
  { en: 'Telangana', hi: 'तेलंगाना' },
  { en: 'Tripura', hi: 'त्रिपुरा' },
  { en: 'Uttar Pradesh', hi: 'उत्तर प्रदेश' },
  { en: 'Uttarakhand', hi: 'उत्तराखंड' },
  { en: 'West Bengal', hi: 'पश्चिम बंगाल' },
  { en: 'Delhi', hi: 'दिल्ली' },
  { en: 'Jammu and Kashmir', hi: 'जम्मू और कश्मीर' },
  { en: 'Ladakh', hi: 'लद्दाख' },
  { en: 'Puducherry', hi: 'पुदुच्चेरी' },
  { en: 'Chandigarh', hi: 'चंडीगढ़' },
]

export const MAX_PAGE_SIZE = 50
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
