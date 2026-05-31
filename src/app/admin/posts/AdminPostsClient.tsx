'use client'

import { useState, useTransition } from 'react'
import { savePostAction, deletePostAction } from '../../actions/posts'
import Editor from '../../../components/Editor'
import { 
  Plus, Edit, Trash2, Globe, EyeOff, Lock, 
  Sparkles, FileText, CheckCircle2, Loader2, ArrowLeft 
} from 'lucide-react'
import Link from 'next/link'

interface PostData {
  id: string
  title: string
  slug: string
  content_json: any
  is_published: boolean
  gated_tier_requirement: string | null
}

interface TierData {
  id: string
  name: string
  price: number
}

interface AdminPostsClientProps {
  posts: PostData[]
  tiers: TierData[]
}

export default function AdminPostsClient({ posts, tiers }: AdminPostsClientProps) {
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null)
  
  // Form States
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [gatedTier, setGatedTier] = useState<string>('public')
  const [isPublished, setIsPublished] = useState(false)
  const [contentJsonStr, setContentJsonStr] = useState('{"type":"doc","content":[]}')
  
  const [message, setMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Generate slug from title
  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!selectedPost) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      )
    }
  }

  const startNewPost = () => {
    setSelectedPost(null)
    setTitle('')
    setSlug('')
    setGatedTier('public')
    setIsPublished(false)
    setContentJsonStr('{"type":"doc","content":[]}')
    setMessage(null)
  }

  const startEditPost = (post: PostData) => {
    setSelectedPost(post)
    setTitle(post.title)
    setSlug(post.slug)
    setGatedTier(post.gated_tier_requirement || 'public')
    setIsPublished(post.is_published)
    setContentJsonStr(JSON.stringify(post.content_json))
    setMessage(null)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!title.trim() || !slug.trim()) {
      setMessage('Title and Slug are required.')
      setIsSuccess(false)
      return
    }

    startTransition(async () => {
      try {
        const res = await savePostAction(
          selectedPost ? selectedPost.id : null,
          title,
          slug,
          contentJsonStr,
          gatedTier === 'public' ? null : gatedTier,
          isPublished
        )

        if (res.success) {
          setMessage(selectedPost ? 'Post updated successfully!' : 'Post created successfully!')
          setIsSuccess(true)
          // If creating a new post, reset form or set as selected post
          if (!selectedPost && res.post) {
            startEditPost(res.post as unknown as PostData)
          }
        }
      } catch (err: any) {
        setMessage(err.message || 'Failed to save post.')
        setIsSuccess(false)
      }
    })
  }

  const handleDelete = (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    startTransition(async () => {
      try {
        const res = await deletePostAction(postId)
        if (res.success) {
          if (selectedPost?.id === postId) {
            startNewPost()
          }
          setMessage('Post deleted successfully.')
          setIsSuccess(true)
        }
      } catch (err: any) {
        setMessage(err.message || 'Failed to delete post.')
        setIsSuccess(false)
      }
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      
      {/* Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-violet-400 text-sm font-medium">
            <Sparkles className="w-4 h-4" /> Admin Controls
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Post Publishing Dashboard</h1>
          <p className="text-neutral-400 text-sm">
            Write content, manage community updates, and gate chapters based on pledge tiers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-white/[0.08] hover:bg-white/[0.04] transition-colors rounded-xl text-sm font-medium flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Exit Admin
          </Link>
          <button
            onClick={startNewPost}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 active:scale-[0.98] transition-all rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-violet-600/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Post
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Posts List */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-neutral-300">
            <FileText className="w-5 h-5 text-violet-400" /> Existing Posts ({posts.length})
          </h2>
          
          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {posts.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/[0.08] rounded-2xl text-neutral-500 text-sm">
                No posts published yet. Click "New Post" to start.
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => startEditPost(post)}
                  className={`p-4 border rounded-2xl transition-all cursor-pointer text-left relative overflow-hidden group ${
                    selectedPost?.id === post.id
                      ? 'bg-violet-600/5 border-violet-500/30'
                      : 'bg-white/[0.01] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-neutral-200 group-hover:text-white transition-colors truncate">
                        {post.title}
                      </h3>
                      <p className="text-xs text-neutral-500 font-mono truncate">
                        /{post.slug}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 items-center text-[10px] pt-1">
                        {post.is_published ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Globe className="w-2.5 h-2.5" /> Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            <EyeOff className="w-2.5 h-2.5" /> Draft
                          </span>
                        )}

                        {post.gated_tier_requirement ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                            <Lock className="w-2.5 h-2.5" /> Gated Tier
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-neutral-500/10 text-neutral-400 border border-white/[0.05]">
                            Public
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(post.id)
                      }}
                      className="p-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Writing/Editing Form */}
        <div className="lg:col-span-8 bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {selectedPost ? (
              <>
                <Edit className="w-5 h-5 text-violet-400" /> Edit Post: <span className="text-neutral-300">{title || 'Untitled'}</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-violet-400" /> Write New Post
              </>
            )}
          </h2>

          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Title & Slug fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-medium text-neutral-400">Post Title</label>
                <input
                  type="text"
                  required
                  placeholder="Chapter 1: The Awakening"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.1] rounded-xl focus:outline-none focus:border-violet-500 transition-all text-sm text-white"
                />
              </div>
              
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-medium text-neutral-400">URL Slug</label>
                <input
                  type="text"
                  required
                  placeholder="chapter-1-the-awakening"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.1] rounded-xl focus:outline-none focus:border-violet-500 transition-all text-sm font-mono text-white"
                />
              </div>
            </div>

            {/* Gating & Publishing Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-[#0d0c15] border border-white/[0.06] rounded-xl text-left">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-violet-400" /> Content Gating
                </label>
                <select
                  value={gatedTier}
                  onChange={(e) => setGatedTier(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.1] rounded-lg focus:outline-none focus:border-violet-500 transition-all text-xs text-neutral-200 cursor-pointer"
                >
                  <option value="public" className="bg-[#0c0b12] text-neutral-200">Public (All backers & visitors)</option>
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#0c0b12] text-neutral-200">
                      Requires {t.name} ($${(t.price / 100).toFixed(0)}+)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-500 leading-normal">
                  If gated, non-qualifying users will see a blurred overlay with an upgrade prompt.
                </p>
              </div>

              <div className="flex flex-col justify-center space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPublished"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 rounded border-white/[0.1] bg-white/[0.03] text-violet-600 focus:ring-violet-500/20 cursor-pointer"
                  />
                  <label htmlFor="isPublished" className="text-xs font-medium text-neutral-200 cursor-pointer select-none">
                    Publish Post to Community
                  </label>
                </div>
                <p className="text-[10px] text-neutral-500 leading-normal pl-7">
                  Toggling to published will immediately send a newsletter blast of the chapter to all registered user emails.
                </p>
              </div>
            </div>

            {/* TipTap Rich Text Editor */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-medium text-neutral-400">Content Editor</label>
              <Editor
                key={selectedPost?.id || 'new'}
                initialContentJsonStr={contentJsonStr}
                onChange={setContentJsonStr}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4 border-t border-white/[0.08] pt-6">
              <button
                type="button"
                onClick={startNewPost}
                className="px-4 py-2.5 border border-white/[0.08] hover:bg-white/[0.04] transition-colors rounded-xl text-sm font-medium cursor-pointer"
              >
                Clear / Reset
              </button>

              <button
                type="submit"
                disabled={isPending}
                className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] transition-all rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-600/10 cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Post...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Save Post Changes
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Feedback messages */}
          {message && (
            <div
              className={`p-4 rounded-xl text-xs border ${
                isSuccess
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
