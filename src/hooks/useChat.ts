import {useCallback, useState} from 'react';
import {useStore} from '../store/useStore';
import {streamChatCompletion} from '../services/openai';
import {detectEmotion} from '../utils/emotion';
import {speak, stopSpeaking} from '../services/voice';
import type {Message} from '../types';

export function useChat() {
  const {settings, messages, addMessage, setCurrentEmotion, setIsSpeaking} = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const generateSystemPrompt = useCallback(() => {
    const emotion = messages.length > 0 ? messages[messages.length - 1].emotion : 'neutral';
    const lang = settings.language === 'hi' ? 'Hindi' : 'English';

    return `You are ${settings.assistantName}, a helpful AI assistant for ${settings.userName}. 
You communicate in ${lang}.
Current detected emotion: ${emotion}.
Respond empathetically to the user's emotional state.
Be concise but helpful. If the user asks to open apps, make calls, or control device features, acknowledge and guide them to use voice commands.
You can also help with ethical hacking tools, password analysis, and security education.`;
  }, [settings, messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!settings.apiKey) {
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: settings.language === 'hi' 
          ? 'कृपया सेटिंग्स में अपना OpenAI API key दर्ज करें।'
          : 'Please enter your OpenAI API key in Settings.',
        timestamp: Date.now(),
      });
      return;
    }

    // Detect emotion from user message
    const emotion = detectEmotion(content, settings.language);
    setCurrentEmotion(emotion);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
      emotion,
    };
    addMessage(userMessage);

    setIsLoading(true);
    setStreamingText('');

    try {
      const systemPrompt = generateSystemPrompt();
      const recentMessages = messages.slice(-10); // Keep last 10 messages for context

      let fullResponse = '';

      for await (const chunk of streamChatCompletion([...recentMessages, userMessage], settings.apiKey, systemPrompt)) {
        fullResponse += chunk;
        setStreamingText(fullResponse);
      }

      // Detect emotion from AI response
      const responseEmotion = detectEmotion(fullResponse, settings.language);
      setCurrentEmotion(responseEmotion);

      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now(),
        emotion: responseEmotion,
      });

      // Speak the response if not too long
      if (fullResponse.length < 300) {
        setIsSpeaking(true);
        await speak(fullResponse, undefined, () => setIsSpeaking(false));
      }
    } catch (error) {
      const errorMessage = settings.language === 'hi'
        ? 'माफ़ करें, मैं आपकी मदद नहीं कर सका। कृपया अपना API key जांचें।'
        : 'Sorry, I could not help you. Please check your API key.';

      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMessage,
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
      setStreamingText('');
    }
  }, [settings, messages, addMessage, setCurrentEmotion, setIsSpeaking, generateSystemPrompt]);

  const stopChat = useCallback(() => {
    stopSpeaking();
    setIsLoading(false);
    setStreamingText('');
  }, []);

  return {
    messages,
    isLoading,
    streamingText,
    sendMessage,
    stopChat,
  };
}
