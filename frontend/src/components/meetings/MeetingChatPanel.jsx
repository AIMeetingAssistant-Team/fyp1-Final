import { useEffect, useRef, useState } from 'react';
import { useChat } from '@livekit/components-react';
import { Send, X } from 'lucide-react';

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MeetingChatPanel({ onClose }) {
  const { chatMessages, send, isSending } = useChat();
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || isSending) return;
    await send(value);
    setText('');
    inputRef.current?.focus();
  };

  return (
    <aside className="vm-side-panel vm-chat-side">
      <header className="vm-side-panel-head">
        <div>
          <h2>In-call messages</h2>
          <p>Visible to everyone in this room</p>
        </div>
        <button type="button" className="vm-side-panel-close" onClick={onClose} aria-label="Close chat">
          <X size={18} />
        </button>
      </header>

      <div className="vm-chat-messages" ref={listRef}>
        {chatMessages.length === 0 ? (
          <div className="vm-chat-empty">
            <p>No messages yet</p>
            <span>Say hello to start the conversation</span>
          </div>
        ) : (
          chatMessages.map((msg, idx, all) => {
            const showHeader = idx === 0 || all[idx - 1].from?.identity !== msg.from?.identity;
            return (
              <div key={msg.id ?? `${msg.timestamp}-${idx}`} className="vm-chat-msg">
                {showHeader && (
                  <div className="vm-chat-msg-head">
                    <span className="vm-chat-author">{msg.from?.name || msg.from?.identity || 'Guest'}</span>
                    <time>{formatTime(msg.timestamp)}</time>
                  </div>
                )}
                <p className="vm-chat-bubble">{msg.message}</p>
              </div>
            );
          })
        )}
      </div>

      <form className="vm-chat-compose" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a message…"
          disabled={isSending}
          maxLength={2000}
        />
        <button type="submit" disabled={isSending || !text.trim()} aria-label="Send message">
          <Send size={18} />
        </button>
      </form>
    </aside>
  );
}
