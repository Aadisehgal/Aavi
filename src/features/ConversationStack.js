import AsyncStorage from '@react-native-async-storage/async-storage';
// MANU AI — J.A.R.V.I.S. Edition v2.0
// Part 13/20 — Proactive Consciousness Features (Conversation Continuity)
// File: src/features/ConversationStack.js
// Generated: 2026-06-24



const CONVERSATION_KEY = '@manu_ai_conversations';
const ACTIVE_CONVERSATION_KEY = '@manu_ai_active_conversation';
const MAX_MESSAGES = 200;
const MAX_CONVERSATIONS = 20;

/**
 * ConversationStack maintains chat history continuity across sessions.
 * Enables "as I was saying" functionality and topic threading.
 */
class ConversationStack {
  constructor() {
    this.conversations = [];
    this.activeConversation = null;
  }

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(CONVERSATION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.conversations = parsed.conversations || [];
      }
      const active = await AsyncStorage.getItem(ACTIVE_CONVERSATION_KEY);
      if (active) {
        this.activeConversation = JSON.parse(active);
      }
    } catch (e) {
      console.warn('[ConversationStack] Init error:', e);
    }
  }

  /**
   * Start a new conversation or resume existing one.
   */
  async startConversation(topic = null) {
    if (this.activeConversation) {
      await this._archiveActiveConversation();
    }

    // Check for related recent conversation
    const related = topic ? this._findRelatedConversation(topic) : null;
    if (related) {
      this.activeConversation = {
        ...related,
        resumedAt: new Date().toISOString(),
        isResumed: true,
      };
    } else {
      this.activeConversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        topic,
        messages: [],
        startedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        isResumed: false,
        status: 'active',
      };
    }

    await this._persistActiveConversation();
    return this.activeConversation;
  }

  /**
   * Add a message to the active conversation.
   */
  async addMessage(role, content, metadata = {}) {
    if (!this.activeConversation) {
      await this.startConversation();
    }

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      role, // 'user' or 'assistant'
      content,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.activeConversation.messages.push(message);
    this.activeConversation.lastActive = new Date().toISOString();

    if (this.activeConversation.messages.length > MAX_MESSAGES) {
      this.activeConversation.messages = this.activeConversation.messages.slice(-MAX_MESSAGES);
    }

    await this._persistActiveConversation();
    return message;
  }

  /**
   * Get conversation history with optional limit.
   */
  async getHistory(limit = 50) {
    if (!this.activeConversation) return [];
    return this.activeConversation.messages.slice(-limit);
  }

  /**
   * Get formatted conversation context for AI prompt.
   */
  async getContextForPrompt(maxMessages = 10) {
    const history = await this.getHistory(maxMessages);
    return history.map(m => ({
      role: m.role,
      content: m.content,
    }));
  }

  /**
   * Find a topic in conversation history to continue.
   */
  async findContinuationTopic(keyword) {
    const keywordLower = (keyword || '').toLowerCase();
    if (!keywordLower) return null;

    // Search active conversation first
    if (this.activeConversation) {
      for (let i = this.activeConversation.messages.length - 1; i >= 0; i--) {
        const msg = this.activeConversation.messages[i];
        if (msg.content.toLowerCase().includes(keywordLower)) {
          return {
            conversationId: this.activeConversation.id,
            messageId: msg.id,
            content: msg.content,
            role: msg.role,
            context: this._getSurroundingMessages(i, 2),
          };
        }
      }
    }

    // Search archived conversations
    for (const conv of this.conversations) {
      for (let i = conv.messages.length - 1; i >= 0; i--) {
        const msg = conv.messages[i];
        if (msg.content.toLowerCase().includes(keywordLower)) {
          return {
            conversationId: conv.id,
            messageId: msg.id,
            content: msg.content,
            role: msg.role,
            context: this._getSurroundingMessagesFromConv(conv, i, 2),
          };
        }
      }
    }

    return null;
  }

  /**
   * Generate "as I was saying" continuation.
   */
  async generateContinuation() {
    if (!this.activeConversation || this.activeConversation.messages.length === 0) {
      return { canContinue: false, message: null, topic: null };
    }

    const lastUserMessage = [...this.activeConversation.messages]
      .reverse()
      .find(m => m.role === 'user');

    const lastAssistantMessage = [...this.activeConversation.messages]
      .reverse()
      .find(m => m.role === 'assistant');

    if (!lastUserMessage) {
      return { canContinue: false, message: null, topic: null };
    }

    const topic = this._extractTopic(lastUserMessage.content);
    const continuation = lastAssistantMessage
      ? `Earlier, we were discussing "${topic}". You had asked: "${lastUserMessage.content.substring(0, 100)}..."`
      : `You were asking about "${topic}". Should I continue with that?`;

    return {
      canContinue: true,
      message: continuation,
      topic,
      lastUserMessage: lastUserMessage.content,
      lastAssistantMessage: lastAssistantMessage?.content,
    };
  }

  /**
   * Get all archived conversations.
   */
  async getConversations() {
    return this.conversations.map(c => ({
      id: c.id,
      topic: c.topic,
      messageCount: c.messages.length,
      startedAt: c.startedAt,
      lastActive: c.lastActive,
      status: c.status,
    }));
  }

  /**
   * End and archive the active conversation.
   */
  async endConversation() {
    if (!this.activeConversation) return;
    this.activeConversation.status = 'ended';
    this.activeConversation.endedAt = new Date().toISOString();
    await this._archiveActiveConversation();
    this.activeConversation = null;
    await AsyncStorage.removeItem(ACTIVE_CONVERSATION_KEY);
  }

  /**
   * Search across all conversations.
   */
  async searchConversations(query) {
    const queryLower = query.toLowerCase();
    const results = [];

    const allConversations = [...this.conversations];
    if (this.activeConversation) allConversations.push(this.activeConversation);

    for (const conv of allConversations) {
      const matchingMessages = conv.messages.filter(m =>
        m.content.toLowerCase().includes(queryLower)
      );
      if (matchingMessages.length > 0) {
        results.push({
          conversationId: conv.id,
          topic: conv.topic,
          matches: matchingMessages.slice(0, 3),
        });
      }
    }

    return results;
  }

  /**
   * Get conversation statistics.
   */
  async getStats() {
    const allConversations = [...this.conversations];
    if (this.activeConversation) allConversations.push(this.activeConversation);

    const totalMessages = allConversations.reduce((sum, c) => sum + c.messages.length, 0);
    const avgMessages = allConversations.length > 0 ? totalMessages / allConversations.length : 0;

    return {
      totalConversations: allConversations.length,
      totalMessages,
      avgMessagesPerConversation: Math.round(avgMessages),
      activeConversationId: this.activeConversation?.id || null,
    };
  }

  // --- Private helpers ---

  _findRelatedConversation(topic) {
    const topicLower = topic.toLowerCase();
    for (const conv of this.conversations) {
      if (conv.topic && conv.topic.toLowerCase() === topicLower) {
        return conv;
      }
      const hasTopic = conv.messages.some(m => m.content.toLowerCase().includes(topicLower));
      if (hasTopic) return conv;
    }
    return null;
  }

  _getSurroundingMessages(index, radius) {
    const start = Math.max(0, index - radius);
    const end = Math.min(this.activeConversation.messages.length, index + radius + 1);
    return this.activeConversation.messages.slice(start, end);
  }

  _getSurroundingMessagesFromConv(conv, index, radius) {
    const start = Math.max(0, index - radius);
    const end = Math.min(conv.messages.length, index + radius + 1);
    return conv.messages.slice(start, end);
  }

  _extractTopic(text) {
    // Simple topic extraction: first 3-5 words or noun phrase
    const words = text.split(/\s+/).filter(w => w.length > 2);
    if (words.length <= 5) return text;
    return words.slice(0, 5).join(' ') + '...';
  }

  async _archiveActiveConversation() {
    if (!this.activeConversation) return;
    this.conversations.push(this.activeConversation);
    if (this.conversations.length > MAX_CONVERSATIONS) {
      this.conversations.shift();
    }
    await this._persistConversations();
  }

  async _persistConversations() {
    try {
      await AsyncStorage.setItem(CONVERSATION_KEY, JSON.stringify({
        conversations: this.conversations,
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('[ConversationStack] Persist error:', e);
    }
  }

  async _persistActiveConversation() {
    try {
      await AsyncStorage.setItem(ACTIVE_CONVERSATION_KEY, JSON.stringify(this.activeConversation));
    } catch (e) {
      console.warn('[ConversationStack] Active persist error:', e);
    }
  }

  async reset() {
    this.conversations = [];
    this.activeConversation = null;
    await AsyncStorage.multiRemove([CONVERSATION_KEY, ACTIVE_CONVERSATION_KEY]);
  }
}

export default new ConversationStack();
