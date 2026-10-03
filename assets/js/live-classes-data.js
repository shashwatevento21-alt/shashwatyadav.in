// SAMPLE DATA for the layout preview. Replace with the real schedule (or a backend feed) before launch.
// startsAt must be ISO 8601 with the IST offset (+05:30). Past classes are hidden automatically.
window.LIVE_CLASSES = [
  {
    id: 'ga-search-campaigns-1',
    courseSlug: 'google-ads',
    course: 'Google Ads',
    topic: 'Search Campaigns That Actually Convert',
    startsAt: '2026-10-09T19:00:00+05:30',
    durationMins: 90,
    summary: 'A live walkthrough of how a Search campaign is structured and optimised, using the same approach applied to live client accounts.',
    learn: [
      'Google Ads account structure: campaigns, ad groups, keywords',
      'Keyword match types and negative keywords',
      'Writing Responsive Search Ads (RSA)',
      'Quality Score and ad rank: what drives lower CPCs'
    ]
  },
  {
    id: 'meta-lead-gen-1',
    courseSlug: 'meta-ads',
    course: 'Meta Ads',
    topic: 'Lead-Gen Campaigns for Local Businesses',
    startsAt: '2026-10-06T19:00:00+05:30',
    durationMins: 75,
    summary: 'How to set up and read Meta lead-generation and Click-to-WhatsApp campaigns for a local business.',
    learn: [
      'Meta Ads Manager fundamentals: campaign, ad set, ad hierarchy',
      'Campaign objectives explained: awareness, engagement, leads, conversions',
      'Click-to-WhatsApp and lead-gen campaigns for local businesses',
      'Reading Ads Manager data: CTR, CPM, CPL, ROAS'
    ]
  },
  {
    id: 'seo-geo-1',
    courseSlug: 'seo-geo',
    course: 'SEO & GEO',
    topic: 'Getting Cited by Google, ChatGPT and Gemini',
    startsAt: '2026-10-12T20:00:00+05:30',
    durationMins: 90,
    summary: 'What GEO (Generative Engine Optimization) is and how to structure content so both classic search and AI answers can use it.',
    learn: [
      'What GEO actually is, and how AI answers choose and cite sources',
      'Structuring content so AI Overviews, ChatGPT and Gemini can parse it',
      'Local SEO and Google Business Profile optimization',
      'Measuring visibility beyond rankings'
    ]
  },
  {
    id: 'tracking-gtm-ga4-1',
    courseSlug: 'conversion-tracking',
    course: 'Conversion Tracking',
    topic: 'GTM + GA4 + Meta Pixel: Setup That Matches',
    startsAt: '2026-10-15T19:30:00+05:30',
    durationMins: 120,
    summary: 'A hands-on session connecting Google Tag Manager, GA4 and Meta Pixel so the numbers across platforms line up.',
    learn: [
      'Google Tag Manager fundamentals: tags, triggers, variables',
      'GA4 setup: events, conversions, audiences',
      'Meta Pixel installation and event setup',
      'Debugging with Tag Assistant, GA4 DebugView and Meta Events Manager'
    ]
  },
  {
    id: 'n8n-lead-routing-1',
    courseSlug: 'n8n-automation',
    course: 'n8n Automation',
    topic: 'Automate Lead Routing: Form to CRM to WhatsApp',
    startsAt: '2026-10-19T19:00:00+05:30',
    durationMins: 90,
    summary: 'Build a working lead-routing workflow in n8n, live, from form submission to notification.',
    learn: [
      'n8n fundamentals: nodes, triggers, workflows',
      'Connecting Google Sheets, Gmail and WhatsApp',
      'Building a lead-routing workflow end to end',
      'Error handling and scheduling in production'
    ]
  },
  {
    id: 'claude-build-1',
    courseSlug: 'claude-mastery',
    course: 'Claude Mastery',
    topic: 'Directing an AI Agent to Build and Automate',
    startsAt: '2026-10-24T11:00:00+05:30',
    durationMins: 120,
    summary: 'Move from typing prompts to directing an AI agent that builds and ships real work.',
    learn: [
      'Defining a problem so an AI agent can act on it',
      'Designing a workflow: inputs, the agent\'s role, output',
      'Testing with real inputs and fixing inconsistencies',
      'A privacy and verification checklist before shipping'
    ]
  },
  {
    id: 'ga-search-campaigns-past',
    courseSlug: 'google-ads',
    course: 'Google Ads',
    topic: 'Past class (should be hidden)',
    startsAt: '2026-09-28T19:00:00+05:30',
    durationMins: 60,
    summary: 'This entry is in the past and must not appear in the list.',
    learn: ['Hidden']
  }
];
