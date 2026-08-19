import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import NewChatModal from '../components/NewChatModal';
import NewGroupModal from '../components/NewGroupModal';
import ConnectionBanner from '../components/ConnectionBanner';
import { useConversations } from '../hooks/useConversations';

export default function ChatPage() {
  const { conversations, loading, addConversation, removeConversation } = useConversations();
  const [activeConv, setActiveConv] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  function openConversation(conv) {
    setActiveConv(conv);
    setMobileShowChat(true);
  }

  function handleCreated(conv) {
    addConversation(conv);
    setShowNewChat(false);
    setShowNewGroup(false);
    openConversation(conv);
  }

  function handleClosedConversation(id) {
    removeConversation(id);
    if (activeConv?.id === id) {
      setActiveConv(null);
      setMobileShowChat(false);
    }
  }

  // Keep the open conversation's member list fresh as the list updates
  // (e.g. after receiving a message that bumps ordering).
  const liveActiveConv = activeConv ? conversations.find((c) => c.id === activeConv.id) || activeConv : null;

  return (
    <div className="chat-page">
      <ConnectionBanner />
      <div className="chat-page__body">
        <Sidebar
          conversations={conversations}
          loading={loading}
          activeId={activeConv?.id}
          onOpenConversation={openConversation}
          onCloseConversation={(conv) => handleClosedConversation(conv.id)}
          onNewChat={() => setShowNewChat(true)}
          onNewGroup={() => setShowNewGroup(true)}
          mobileHidden={mobileShowChat}
        />

        <main className={`chat-page__main ${mobileShowChat ? 'chat-page__main--mobile-visible' : ''}`}>
          {liveActiveConv ? (
            <ChatWindow
              key={liveActiveConv.id}
              conversation={liveActiveConv}
              onBack={() => setMobileShowChat(false)}
              onClosed={handleClosedConversation}
            />
          ) : (
            <div className="chat-page__placeholder">
              <div className="chat-page__placeholder-mark">◆</div>
              <p>Select a conversation, or start a new one.</p>
            </div>
          )}
        </main>
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} onCreated={handleCreated} />}
      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} onCreated={handleCreated} />}
    </div>
  );
}
