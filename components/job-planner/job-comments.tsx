"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, Send, Reply, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: User;
  mentions: string[];
  replies: Comment[];
}

interface JobCommentsProps {
  jobPlanId: string;
}

export function JobComments({ jobPlanId }: JobCommentsProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionUsers, setMentionUsers] = useState<User[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/job-plans/${jobPlanId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [jobPlanId]);

  const searchUsers = useCallback(async (query: string) => {
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setMentionUsers(data);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    }
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (mentionSearch) {
      searchUsers(mentionSearch);
    } else {
      setMentionUsers([]);
    }
  }, [mentionSearch, searchUsers]);

  const handleTextChange = (
    value: string,
    setter: (value: string) => void,
    textarea: HTMLTextAreaElement | null
  ) => {
    setter(value);
    
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    setCursorPosition(cursorPos);

    // Check if we're typing a mention
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionSearch(mentionMatch[1]);
    } else {
      setShowMentions(false);
      setMentionSearch("");
    }
  };

  const insertMention = (
    user: User,
    currentValue: string,
    setter: (value: string) => void
  ) => {
    const textBeforeCursor = currentValue.substring(0, cursorPosition);
    const textAfterCursor = currentValue.substring(cursorPosition);
    
    // Find the @ symbol position
    const mentionStart = textBeforeCursor.lastIndexOf("@");
    const beforeMention = currentValue.substring(0, mentionStart);
    
    // Create mention markup: @[Name](userId)
    const mentionMarkup = `@[${user.name || user.email}](${user.id}) `;
    
    const newValue = beforeMention + mentionMarkup + textAfterCursor;
    setter(newValue);
    setShowMentions(false);
    setMentionSearch("");
  };

  const submitComment = async (content: string, parentId?: string) => {
    if (!content.trim()) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/job-plans/${jobPlanId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId }),
      });

      if (response.ok) {
        fetchComments();
        if (parentId) {
          setReplyContent("");
          setReplyingTo(null);
        } else {
          setNewComment("");
        }
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatContent = (content: string) => {
    // Convert @[Name](userId) to styled mentions
    return content.replace(
      /@\[([^\]]+)\]\([^)]+\)/g,
      '<span class="text-orange-600 font-medium">@$1</span>'
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-medium">Comments</span>
        <span className="text-xs text-slate-400">({comments.length})</span>
      </div>

      {/* New Comment Input */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={newComment}
          onChange={(e) => handleTextChange(e.target.value, setNewComment, textareaRef.current)}
          placeholder="Add a comment... Use @ to mention someone"
          className="min-h-[80px] pr-12 resize-none"
          disabled={isSubmitting}
        />
        <Button
          size="sm"
          className="absolute bottom-2 right-2"
          onClick={() => submitComment(newComment)}
          disabled={!newComment.trim() || isSubmitting}
        >
          <Send className="h-4 w-4" />
        </Button>

        {/* Mention Dropdown */}
        {showMentions && mentionUsers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
            {mentionUsers.map((user) => (
              <button
                key={user.id}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                onClick={() => insertMention(user, newComment, setNewComment)}
              >
                <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium">
                  {(user.name || user.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="text-sm text-slate-400 text-center py-4">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-sm text-slate-400 text-center py-4">No comments yet</div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              {/* Main Comment */}
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium shrink-0">
                    {(comment.author.name || comment.author.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {comment.author.name || comment.author.email}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatTimeAgo(comment.createdAt)}
                      </span>
                    </div>
                    <p
                      className="text-sm text-slate-700"
                      dangerouslySetInnerHTML={{ __html: formatContent(comment.content) }}
                    />
                    <button
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mt-2"
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    >
                      <Reply className="h-3 w-3" />
                      Reply
                    </button>
                  </div>
                </div>
              </div>

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <div className="ml-8 relative">
                  <Textarea
                    ref={replyTextareaRef}
                    value={replyContent}
                    onChange={(e) => handleTextChange(e.target.value, setReplyContent, replyTextareaRef.current)}
                    placeholder="Write a reply..."
                    className="min-h-[60px] pr-12 resize-none text-sm"
                    disabled={isSubmitting}
                  />
                  <Button
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => submitComment(replyContent, comment.id)}
                    disabled={!replyContent.trim() || isSubmitting}
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="ml-8 space-y-2">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="bg-slate-50/50 rounded-lg p-3 border-l-2 border-slate-200">
                      <div className="flex items-start gap-2">
                        <CornerDownRight className="h-4 w-4 text-slate-300 shrink-0 mt-1" />
                        <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium shrink-0">
                          {(reply.author.name || reply.author.email)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {reply.author.name || reply.author.email}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatTimeAgo(reply.createdAt)}
                            </span>
                          </div>
                          <p
                            className="text-sm text-slate-700"
                            dangerouslySetInnerHTML={{ __html: formatContent(reply.content) }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
