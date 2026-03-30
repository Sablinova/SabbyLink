import { useState, useEffect, useRef } from 'react';
import { aiApi } from '../lib/api';
import { Brain, Send, Plus, Settings, Trash2, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Config {
  id: number;
  provider: string;
  model: string;
  enabled: boolean;
}

export default function AIPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Config form state
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4-turbo-preview');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConfigs = async () => {
    try {
      const response = await aiApi.getConfigs();
      setConfigs(response.data.configs);
      if (response.data.configs.length > 0 && !selectedConfig) {
        setSelectedConfig(response.data.configs[0]);
      }
    } catch (error) {
      console.error('Failed to fetch AI configs:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedConfig || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await aiApi.chat(
        selectedConfig.id,
        userMessage,
        conversationId || undefined
      );

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.data.message },
      ]);
      setConversationId(response.data.conversationId);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${error.response?.data?.error || 'Failed to get response'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await aiApi.createConfig({ provider, apiKey, model });
      await fetchConfigs();
      setShowConfigModal(false);
      setApiKey('');
    } catch (error) {
      console.error('Failed to create AI config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">AI Chat</h1>
          <p className="text-muted-foreground">Universal AI integration</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedConfig?.id || ''}
            onChange={(e) => {
              const config = configs.find((c) => c.id === parseInt(e.target.value));
              setSelectedConfig(config || null);
              startNewChat();
            }}
            className="input w-48"
          >
            <option value="">Select provider</option>
            {configs.map((config) => (
              <option key={config.id} value={config.id}>
                {config.provider} ({config.model})
              </option>
            ))}
          </select>
          <button onClick={startNewChat} className="btn-outline">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={() => setShowConfigModal(true)} className="btn-outline">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 card overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Brain className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
              <p className="text-muted-foreground max-w-md">
                {selectedConfig
                  ? 'Type a message below to start chatting with AI'
                  : 'Configure an AI provider to get started'}
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-brand-500 text-white'
                    : 'bg-muted'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted p-3 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={
                selectedConfig
                  ? 'Type a message...'
                  : 'Select an AI provider first'
              }
              className="input flex-1"
              disabled={!selectedConfig || isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!selectedConfig || !input.trim() || isLoading}
              className="btn-primary"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-fade-in">
            <h2 className="text-xl font-bold mb-4">Configure AI Provider</h2>
            <form onSubmit={handleCreateConfig} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="input"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="google">Google (Gemini)</option>
                  <option value="groq">Groq</option>
                  <option value="ollama">Ollama (Local)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="input"
                  placeholder="sk-..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="input"
                  placeholder="gpt-4-turbo-preview"
                />
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary flex-1"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
