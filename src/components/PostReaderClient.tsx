'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { toggleReactionAction, addCommentAction } from '../app/actions/comments'
import { 
  MessageSquare, Smile, X, Send, Lock, 
  Sparkles, ShieldCheck, ChevronRight, UserCircle2 
} from 'lucide-react'
import Link from 'next/link'

interface User {
  id: string
  display_name: string | null
  avatar_url: string | null
}

interface Comment {
  id: string
  block_id: string
  text: string
  created_at: Date | string
  user: User
  parent_id: string | null
}

interface Reaction {
  id: string
  block_id: string
  emoji: string
  user_id: string
}

interface PostReaderClientProps {
  postId: string
  postTitle: string
  postSlug: string
  contentJson: any
  comments: Comment[]
  reactions: Reaction[]
  currentUser: User | null
  hasAccess: boolean
  requiredTierName: string | null
}

const EMOJIS = ['🔥', '👍', '💡', '❤️', '😮']

export default function PostReaderClient({
  postId,
  postTitle,
  postSlug,
  contentJson,
  comments: initialComments,
  reactions: initialReactions,
  currentUser,
  hasAccess,
  requiredTierName,
}: PostReaderClientProps) {
  const [activeCommentsBlockId, setActiveCommentsBlockId] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [reactions, setReactions] = useState<Reaction[]>(initialReactions)
  const [newCommentText, setNewCommentText] = useState('')
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null)
  
  const [isPending, startTransition] = useTransition()

  // Parse Tiptap blocks
  const blocks = contentJson?.content || []
  
  // Enforce gating: If no access, only show first two paragraphs
  const visibleBlocks = hasAccess ? blocks : blocks.slice(0, 2)

  // Toggle emoji reactions
  const handleEmojiClick = (blockId: string, emoji: string) => {
    if (!currentUser) {
      alert('Please log in to react to paragraphs.')
      return
    }
    if (!currentUser.display_name) {
      alert('Please complete onboarding by setting a display name.')
      return
    }

    startTransition(async () => {
      try {
        const res = await toggleReactionAction(postId, blockId, emoji)
        if (res.success) {
          if (res.action === 'added') {
            setReactions(prev => [
              ...prev,
              {
                id: Math.random().toString(), // Temp ID
                block_id: blockId,
                emoji,
                user_id: currentUser.id,
              },
            ])
          } else {
            setReactions(prev => prev.filter(r => !(r.block_id === blockId && r.emoji === emoji && r.user_id === currentUser.id)))
          }
        }
      } catch (err: any) {
        alert(err.message || 'Failed to toggle reaction.')
      }
    })
  }

  // Submit comment/reply
  const handleCommentSubmit = (e: React.FormEvent, blockId: string) => {
    e.preventDefault()
    if (!newCommentText.trim()) return
    if (!currentUser) {
      alert('Please log in to comment.')
      return
    }

    startTransition(async () => {
      try {
        const res = await addCommentAction(postId, blockId, newCommentText, replyingToCommentId)
        if (res.success && res.comment) {
          setComments(prev => [...prev, res.comment as unknown as Comment])
          setNewCommentText('')
          setReplyingToCommentId(null)
        }
      } catch (err: any) {
        alert(err.message || 'Failed to submit comment.')
      }
    })
  }

  // Group reactions by blockId and emoji
  const getBlockReactions = (blockId: string) => {
    const blockList = reactions.filter(r => r.block_id === blockId)
    const counts: { [emoji: string]: { count: number; active: boolean } } = {}
    
    blockList.forEach(r => {
      if (!counts[r.emoji]) {
        counts[r.emoji] = { count: 0, active: false }
      }
      counts[r.emoji].count += 1
      if (currentUser && r.user_id === currentUser.id) {
        counts[r.emoji].active = true
      }
    })

    return counts
  }

  // Count comments for block
  const getBlockCommentCount = (blockId: string) => {
    return comments.filter(c => c.block_id === blockId).length
  }

  // Render a block node based on TipTap JSON format
  const renderBlockNode = (node: any) => {
    if (!node || typeof node !== 'object') return null

    const blockId = node.attrs?.block_id
    if (!blockId) return null

    const renderChildren = (children: any[]): React.ReactNode => {
      return children?.map((child, i) => {
        if (child.type === 'text') {
          let text: React.ReactNode = child.text
          if (child.marks) {
            child.marks.forEach((mark: any) => {
              if (mark.type === 'bold') text = <strong key={i}>{text}</strong>
              if (mark.type === 'italic') text = <em key={i}>{text}</em>
              if (mark.type === 'code') text = <code key={i} className="bg-white/10 px-1 py-0.5 rounded text-violet-400 font-mono text-xs">{text}</code>
              if (mark.type === 'link') {
                text = (
                  <a 
                    key={i} 
                    href={mark.attrs?.href || '#'} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-violet-400 hover:text-violet-300 underline"
                  >
                    {text}
                  </a>
                )
              }
            });
          }
          return <span key={i}>{text}</span>
        }
        return null
      })
    }

    const textContent = Array.isArray(node.content) ? renderChildren(node.content) : null
    const blockReactionCounts = getBlockReactions(blockId)
    const blockCommentCount = getBlockCommentCount(blockId)

    // Render nodes with hover controls wrapper
    const wrapInInteraction = (el: React.ReactNode) => (
      <div key={blockId} className="group relative pr-12 my-6">
        
        {/* Floating Interaction Toolbar (visible on hover) */}
        {hasAccess && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 p-1.5 bg-[#0e0d16] border border-white/[0.08] rounded-xl shadow-lg z-10">
            {/* Quick Reactions */}
            <div className="flex items-center gap-1">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(blockId, emoji)}
                  className={`w-7 h-7 flex items-center justify-center text-sm rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer ${
                    blockReactionCounts[emoji]?.active ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            <div className="w-[1px] h-4 bg-white/[0.08]" />

            {/* Comments Button */}
            <button
              onClick={() => setActiveCommentsBlockId(blockId)}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.02] hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* The Actual Content Node */}
        <div className="relative">
          {el}

          {/* Social Badges at Bottom-Right of Paragraph */}
          {hasAccess && (Object.keys(blockReactionCounts).length > 0 || blockCommentCount > 0) && (
            <div className="flex flex-wrap gap-1.5 items-center mt-2 justify-start text-[10px] text-neutral-400 select-none">
              {Object.entries(blockReactionCounts).map(([emoji, meta]) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(blockId, emoji)}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] transition-colors cursor-pointer ${
                    meta.active 
                      ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' 
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.08] text-neutral-400'
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{meta.count}</span>
                </button>
              ))}

              {blockCommentCount > 0 && (
                <button
                  onClick={() => setActiveCommentsBlockId(blockId)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.08] text-neutral-400 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3 h-3 text-neutral-400" />
                  <span>{blockCommentCount}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )

    switch (node.type) {
      case 'heading':
        const level = node.attrs?.level || 1
        if (level === 1) {
          return wrapInInteraction(
            <h2 className="text-2xl font-bold tracking-tight text-white mt-8 mb-4">
              {textContent}
            </h2>
          )
        }
        return wrapInInteraction(
          <h3 className="text-xl font-bold tracking-tight text-white mt-6 mb-3">
            {textContent}
          </h3>
        )
      case 'paragraph':
        return wrapInInteraction(
          <p className="text-neutral-300 leading-relaxed text-base font-normal">
            {textContent}
          </p>
        )
      case 'blockquote':
        return wrapInInteraction(
          <blockquote className="border-l-4 border-violet-500 bg-violet-500/[0.02] pl-4 py-1.5 pr-2 my-4 italic text-neutral-400 rounded-r-lg">
            {textContent}
          </blockquote>
        )
      case 'codeBlock':
        return wrapInInteraction(
          <pre className="bg-[#0b0a11] border border-white/[0.06] p-4 rounded-xl overflow-x-auto text-neutral-300 font-mono text-sm leading-normal my-4">
            <code>{textContent}</code>
          </pre>
        )
      case 'image':
        return wrapInInteraction(
          <div className="my-6 text-center">
            <img src={node.attrs?.src} alt={node.attrs?.alt || ''} className="max-w-full rounded-xl border border-white/[0.08] shadow-lg" />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="relative min-h-screen">
      
      {/* Top Banner Navigation */}
      <div className="w-full border-b border-white/[0.06] bg-[#08080c]/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/community" className="text-sm font-semibold tracking-tight text-neutral-200 hover:text-white flex items-center gap-1.5 transition-colors">
            <Sparkles className="w-4 h-4 text-violet-400" /> Community Feed
          </Link>
          
          <div className="flex items-center gap-3">
            {currentUser ? (
              <Link href="/dashboard" className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] transition-colors font-medium">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors font-medium">
                Log In
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 pb-32">
        {/* Post Title */}
        <div className="space-y-4 text-left border-b border-white/[0.08] pb-8 mb-8">
          {requiredTierName && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-xs text-indigo-400 font-medium">
              <Lock className="w-3.5 h-3.5" /> Gated: Requires {requiredTierName}
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-500 bg-clip-text text-transparent">
            {postTitle}
          </h1>
          <p className="text-xs text-neutral-500 font-mono">
            URL: /{postSlug}
          </p>
        </div>

        {/* Article Render Canvas */}
        <div className="prose prose-invert max-w-none text-left">
          {visibleBlocks.length === 0 ? (
            <p className="text-neutral-500 text-sm italic">This post contains no content yet.</p>
          ) : (
            visibleBlocks.map((node: any) => renderBlockNode(node))
          )}
        </div>

        {/* Gating Blurred Overlay & Action Prompt */}
        {!hasAccess && (
          <div className="relative mt-8 py-16 px-6 border border-white/[0.08] rounded-3xl bg-gradient-to-b from-[#0f0e1a]/80 to-[#07060b] overflow-hidden text-center">
            
            {/* Visual blur background glow */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-none" />
            <div className="absolute top-[-50%] left-[20%] w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[80px] pointer-events-none" />

            <div className="relative z-10 max-w-md mx-auto space-y-6">
              <div className="inline-flex p-4 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight text-white">Upgrade Your Pledge to Keep Reading</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  This chapter is gated for backers of the <strong className="text-violet-300">{requiredTierName}</strong> tier or higher. Upgrade your pledge delta now to read the full text and join the discussion!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                {currentUser ? (
                  <Link
                    href="/dashboard"
                    className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] transition-all rounded-xl font-medium text-sm inline-flex items-center justify-center gap-1.5 shadow-lg shadow-violet-600/10"
                  >
                    View Upgrade Options <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 active:scale-[0.98] transition-all rounded-xl font-medium text-sm inline-flex items-center justify-center gap-1.5 text-neutral-200"
                    >
                      Log In / Sign In
                    </Link>
                    <Link
                      href="/"
                      className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] transition-all rounded-xl font-medium text-sm inline-flex items-center justify-center gap-1.5 shadow-lg shadow-violet-600/10"
                    >
                      Pledge Tiers <ChevronRight className="w-4 h-4" />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slide-out Comments Panel Drawer (Medium-style) */}
      {activeCommentsBlockId && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-[#0c0b12] border-l border-white/[0.08] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
          
          {/* Drawer Header */}
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-black/20">
            <div className="space-y-0.5">
              <h3 className="font-semibold text-neutral-200 text-sm">Inline Comments</h3>
              <p className="text-[10px] text-neutral-500 truncate max-w-[280px]">
                Scoped to paragraph {activeCommentsBlockId.slice(0, 8)}
              </p>
            </div>
            <button
              onClick={() => {
                setActiveCommentsBlockId(null)
                setReplyingToCommentId(null)
              }}
              className="p-1.5 rounded-lg hover:bg-white/[0.05] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Thread List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {comments.filter(c => c.block_id === activeCommentsBlockId).length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-8 space-y-2 text-neutral-500">
                <MessageSquare className="w-8 h-8 text-neutral-700 animate-pulse" />
                <p className="text-sm">No comments on this paragraph yet.</p>
                <p className="text-xs">Be the first to share your thoughts!</p>
              </div>
            ) : (
              comments
                .filter(c => c.block_id === activeCommentsBlockId)
                .map(comment => {
                  const isReply = !!comment.parent_id
                  return (
                    <div 
                      key={comment.id}
                      className={`p-3.5 rounded-xl border relative text-left ${
                        isReply 
                          ? 'ml-6 bg-white/[0.01] border-white/[0.04]' 
                          : 'bg-white/[0.02] border-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                          <UserCircle2 className="w-4 h-4" />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-semibold text-xs text-neutral-200 truncate">
                              {comment.user.display_name || 'Anonym Backer'}
                            </span>
                            <span className="text-[9px] text-neutral-500">
                              {new Date(comment.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-300 leading-relaxed break-words whitespace-pre-line">
                            {comment.text}
                          </p>
                          
                          {/* Reply trigger button */}
                          {!isReply && currentUser && (
                            <button
                              onClick={() => setReplyingToCommentId(comment.id)}
                              className="text-[10px] text-violet-400 hover:text-violet-300 font-medium pt-1 hover:underline cursor-pointer block"
                            >
                              Reply
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
            )}
          </div>

          {/* Replying indicator bar */}
          {replyingToCommentId && (
            <div className="px-4 py-2 bg-violet-600/10 border-t border-violet-500/20 text-xs text-violet-400 flex items-center justify-between">
              <span>
                Replying to <strong>{comments.find(c => c.id === replyingToCommentId)?.user.display_name}</strong>
              </span>
              <button 
                onClick={() => setReplyingToCommentId(null)}
                className="text-[10px] font-bold text-neutral-400 hover:text-white hover:underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Drawer Form Editor */}
          <div className="p-4 border-t border-white/[0.08] bg-[#0a0a0f]">
            {currentUser ? (
              <form onSubmit={(e) => handleCommentSubmit(e, activeCommentsBlockId)} className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder={replyingToCommentId ? "Write your reply..." : "Write a comment..."}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white/[0.03] border border-white/[0.1] rounded-xl focus:outline-none focus:border-violet-500 text-xs text-white"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="p-2.5 bg-violet-600 hover:bg-violet-500 transition-colors rounded-xl text-white cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="text-center py-2 text-xs text-neutral-500">
                Please <Link href="/login" className="text-violet-400 hover:underline">Log In</Link> to share comments.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
