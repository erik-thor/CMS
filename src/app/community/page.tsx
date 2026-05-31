import { prisma } from '../../lib/db'
import { getSessionUser } from '../../lib/auth'
import { getBlockSnippet } from '../../lib/blocks'
import { MessageSquare, Sparkles, Heart, Zap, UserCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface FeedItem {
  id: string
  type: 'comment' | 'reaction'
  userName: string
  createdAt: Date
  postTitle: string
  postSlug: string
  emoji?: string
  text?: string
  snippet: string
}

export default async function CommunityPage() {
  const currentUser = await getSessionUser()

  // Fetch comments and reactions in parallel
  const [dbComments, dbReactions] = await Promise.all([
    prisma.comment.findMany({
      take: 40,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { display_name: true } },
        post: { select: { title: true, slug: true, content_json: true } },
      },
    }),
    prisma.reaction.findMany({
      take: 40,
      orderBy: { created_at: 'desc' },
      include: {
        user: { select: { display_name: true } },
        post: { select: { title: true, slug: true, content_json: true } },
      },
    }),
  ])

  // Merge and transform into chronological timeline
  const feed: FeedItem[] = [
    ...dbComments.map((c) => ({
      id: c.id,
      type: 'comment' as const,
      userName: c.user.display_name || 'Anonym Backer',
      createdAt: c.created_at,
      postTitle: c.post.title,
      postSlug: c.post.slug,
      text: c.text,
      snippet: getBlockSnippet(c.post.content_json, c.block_id, 90),
    })),
    ...dbReactions.map((r) => ({
      id: r.id,
      type: 'reaction' as const,
      userName: r.user.display_name || 'Anonym Backer',
      createdAt: r.created_at,
      postTitle: r.post.title,
      postSlug: r.post.slug,
      emoji: r.emoji,
      snippet: getBlockSnippet(r.post.content_json, r.block_id, 90),
    })),
  ]

  // Sort by created date descending
  feed.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const finalFeed = feed.slice(0, 50)

  return (
    <div className="min-h-screen bg-[#08080c] bg-radial-[at_top_left,_var(--tw-gradient-stops)] from-[#120e29] via-[#090812] to-[#040408] text-white">
      
      {/* Visual background ambient lighting */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6 mb-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-violet-400 text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Live Platform Activity
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Community Reactions Feed</h1>
            <p className="text-neutral-400 text-sm">
              See what parts of the book are sparking reactions, comments, and discussions in real-time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 border border-white/[0.08] hover:bg-white/[0.04] transition-colors rounded-xl text-sm font-medium"
            >
              Campaign
            </Link>
            {currentUser ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all rounded-xl text-sm font-medium shadow-lg shadow-violet-600/10"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all rounded-xl text-sm font-medium shadow-lg shadow-violet-600/10"
              >
                Log In
              </Link>
            )}
          </div>
        </div>

        {/* Timeline Feed */}
        <div className="relative border-l border-white/[0.08] ml-4 pl-6 space-y-8 text-left">
          {finalFeed.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-white/[0.08] rounded-3xl text-neutral-500 text-sm ml-[-25px] pl-6 bg-white/[0.01]">
              No community activity yet. Be the first to leave reactions or comments on chapters!
            </div>
          ) : (
            finalFeed.map((item) => (
              <div key={item.id} className="relative group">
                
                {/* Timeline node icon */}
                <div className="absolute left-[-39px] top-1.5 w-6 h-6 rounded-full bg-[#0a0a0f] border border-white/[0.08] flex items-center justify-center text-neutral-400 group-hover:border-violet-500/50 transition-colors">
                  {item.type === 'comment' ? (
                    <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
                  ) : (
                    <span className="text-xs leading-none">{item.emoji}</span>
                  )}
                </div>

                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-300">
                  <div className="flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
                    <span className="font-semibold text-neutral-200 flex items-center gap-1">
                      <UserCircle2 className="w-3.5 h-3.5 text-neutral-500" /> {item.userName}
                    </span>
                    <span>
                      {item.type === 'comment' ? 'commented on' : `reacted ${item.emoji} to`}
                    </span>
                    <Link
                      href={`/posts/${item.postSlug}`}
                      className="text-violet-400 hover:text-violet-300 font-medium hover:underline flex items-center gap-0.5"
                    >
                      {item.postTitle} <ArrowRight className="w-3 h-3" />
                    </Link>
                    <span className="text-[10px] text-neutral-600 font-mono ml-auto">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Context quote snippet */}
                  <div className="mt-3 pl-3 border-l-2 border-white/[0.08] italic text-neutral-500 text-xs py-0.5 leading-relaxed">
                    "{item.snippet}"
                  </div>

                  {/* Comment text if it is a comment */}
                  {item.type === 'comment' && item.text && (
                    <p className="mt-3 text-neutral-200 text-sm leading-relaxed whitespace-pre-wrap">
                      {item.text}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
