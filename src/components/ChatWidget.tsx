import { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  X, 
  Home, 
  MessageSquare, 
  HelpCircle,
  ChevronRight,
  Clock,
  Send,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

// WhatsApp icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Icon mapping for action cards
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  message: MessageSquare,
  clock: Clock,
  help: HelpCircle,
  whatsapp: WhatsAppIcon,
};

interface ActionCard {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  action: 'message' | 'messages' | 'help' | 'whatsapp' | 'link';
  link?: string;
}

interface TeamAvatar {
  name: string;
  url: string;
}

interface AutoMessage {
  id: string;
  content: string;
  delay_ms: number;
  trigger: 'welcome' | 'followup' | 'keyword';
  keywords?: string[];
  order: number;
}

export interface ChatWidgetConfig {
  is_enabled: boolean;
  title: string;
  subtitle: string;
  primary_color: string;
  position: string;
  icon_type: string;
  welcome_message: string;
  show_whatsapp_button: boolean;
  whatsapp_number: string | null;
  whatsapp_label: string;
  show_help_button: boolean;
  help_url: string | null;
  help_label: string;
  show_typing_indicator: boolean;
  typing_delay_ms: number;
  team_avatars: TeamAvatar[];
  action_cards: ActionCard[];
  greeting_text: string;
  show_bottom_nav: boolean;
  logo_url: string | null;
  auto_messages?: AutoMessage[];
}

interface ChatWidgetProps {
  config: ChatWidgetConfig;
  previewMode?: boolean;
}

type TabType = 'home' | 'messages' | 'help';

interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
}

export function ChatWidget({ config, previewMode = false }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(previewMode);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [welcomeMessagesSent, setWelcomeMessagesSent] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<Date>(new Date());
  const [followUpsSent, setFollowUpsSent] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update last activity time
  const updateLastActivity = () => {
    setLastActivityTime(new Date());
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send welcome messages sequence
  useEffect(() => {
    if (!isOpen || !showConversation || welcomeMessagesSent) return;

    const welcomeMessages = config.auto_messages
      ?.filter(msg => msg.trigger === 'welcome')
      .sort((a, b) => a.order - b.order) || [];

    // If no auto messages configured, use fallback welcome_message
    if (welcomeMessages.length === 0) {
      if (config.welcome_message) {
        if (config.show_typing_indicator) {
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setMessages([{
              id: '1',
              content: config.welcome_message,
              isBot: true,
              timestamp: new Date()
            }]);
          }, config.typing_delay_ms || 1500);
        } else {
          setMessages([{
            id: '1',
            content: config.welcome_message,
            isBot: true,
            timestamp: new Date()
          }]);
        }
      }
      setWelcomeMessagesSent(true);
      return;
    }

    // Send multiple welcome messages in sequence
    let totalDelay = 0;
    welcomeMessages.forEach((msg, index) => {
      const delay = index === 0 ? msg.delay_ms : totalDelay + msg.delay_ms;
      totalDelay = delay;

      if (config.show_typing_indicator && index === 0) {
        setIsTyping(true);
      }

      setTimeout(() => {
        if (config.show_typing_indicator) {
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, {
              id: `welcome-${msg.id}`,
              content: msg.content,
              isBot: true,
              timestamp: new Date()
            }]);
          }, 1000);
        } else {
          setMessages(prev => [...prev, {
            id: `welcome-${msg.id}`,
            content: msg.content,
            isBot: true,
            timestamp: new Date()
          }]);
        }
      }, delay);
    });

    setWelcomeMessagesSent(true);
  }, [isOpen, showConversation, welcomeMessagesSent, config]);

  // Reset follow-ups when conversation is closed
  useEffect(() => {
    if (!showConversation) {
      setFollowUpsSent(new Set());
    }
  }, [showConversation]);

  // Follow-up messages based on inactivity
  useEffect(() => {
    if (!isOpen || !showConversation) {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    const followUpMessages = config.auto_messages
      ?.filter(msg => msg.trigger === 'followup')
      .sort((a, b) => a.order - b.order) || [];

    if (followUpMessages.length === 0) return;

    // Check inactivity every 2 seconds
    inactivityTimerRef.current = setInterval(() => {
      const now = new Date();
      const inactivityMs = now.getTime() - lastActivityTime.getTime();

      // Find follow-up message that should be sent
      for (const msg of followUpMessages) {
        if (!followUpsSent.has(msg.id) && inactivityMs >= msg.delay_ms) {
          // Send follow-up message
          if (config.show_typing_indicator) {
            setIsTyping(true);
            setTimeout(() => {
              setIsTyping(false);
              setMessages(prev => [...prev, {
                id: `followup-${msg.id}-${Date.now()}`,
                content: msg.content,
                isBot: true,
                timestamp: new Date()
              }]);
            }, 1000);
          } else {
            setMessages(prev => [...prev, {
              id: `followup-${msg.id}-${Date.now()}`,
              content: msg.content,
              isBot: true,
              timestamp: new Date()
            }]);
          }
          
          setFollowUpsSent(prev => new Set([...prev, msg.id]));
          // Update last activity to prevent rapid consecutive messages
          setLastActivityTime(new Date());
          break; // Only send one follow-up at a time
        }
      }
    }, 2000);

    return () => {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [isOpen, showConversation, lastActivityTime, followUpsSent, config]);

  if (!config.is_enabled) return null;

  const handleActionCardClick = (card: ActionCard) => {
    updateLastActivity();
    switch (card.action) {
      case 'message':
        setActiveTab('messages');
        setShowConversation(true);
        break;
      case 'messages':
        setActiveTab('messages');
        break;
      case 'help':
        if (config.help_url) {
          window.open(config.help_url, '_blank');
        } else {
          setActiveTab('help');
        }
        break;
      case 'whatsapp':
        if (config.whatsapp_number) {
          window.open(`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}`, '_blank');
        }
        break;
      case 'link':
        if (card.link) {
          window.open(card.link, '_blank');
        }
        break;
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    updateLastActivity();
    
    const userMessage = inputValue.trim();
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: userMessage,
      isBot: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputValue('');

    // Check for keyword-triggered auto messages
    const keywordMessages = config.auto_messages
      ?.filter(msg => msg.trigger === 'keyword' && msg.keywords?.some(
        keyword => userMessage.toLowerCase().includes(keyword.toLowerCase())
      ))
      .sort((a, b) => a.order - b.order) || [];

    if (keywordMessages.length > 0) {
      // Send keyword-matched messages
      keywordMessages.forEach((msg, index) => {
        const delay = (index + 1) * (msg.delay_ms || config.typing_delay_ms || 1500);
        
        if (config.show_typing_indicator) {
          setTimeout(() => setIsTyping(true), index === 0 ? 500 : delay - 1000);
        }

        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, {
            id: `keyword-${msg.id}-${Date.now()}`,
            content: msg.content,
            isBot: true,
            timestamp: new Date()
          }]);
        }, delay);
      });
    } else {
      // Default bot response
      if (config.show_typing_indicator) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            content: 'Obrigado pela sua mensagem! Um membro da nossa equipe responderá em breve.',
            isBot: true,
            timestamp: new Date()
          }]);
        }, config.typing_delay_ms || 1500);
      }
    }
  };

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || MessageSquare;
  };

  const renderHomeTab = () => (
    <div className="flex flex-col h-full">
      {/* Greeting */}
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-2xl font-bold text-foreground">
          {config.greeting_text || 'Olá! 👋'}
        </h2>
      </div>

      {/* Action Cards */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {config.action_cards?.map((card) => {
          const IconComponent = getIconComponent(card.icon);
          return (
            <div
              key={card.id}
              onClick={() => handleActionCardClick(card)}
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl 
                         hover:bg-muted/50 cursor-pointer transition-all group"
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                card.iconBg || "bg-primary"
              )}>
                <IconComponent className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">{card.title}</h4>
                <p className="text-sm text-muted-foreground truncate">{card.subtitle}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
            </div>
          );
        })}
      </div>

      {/* Team Avatars */}
      {config.team_avatars && config.team_avatars.length > 0 && (
        <div className="px-5 py-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {config.team_avatars.slice(0, 4).map((avatar, index) => (
                <img
                  key={index}
                  src={avatar.url}
                  alt={avatar.name}
                  className="w-8 h-8 rounded-full border-2 border-background object-cover"
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground ml-2">
              Nossa equipe está online
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderMessagesTab = () => (
    <div className="flex flex-col h-full">
      {showConversation ? (
        <>
          {/* Back button */}
          <div className="px-4 py-3 border-b border-border">
            <button 
              onClick={() => setShowConversation(false)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Voltar</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3",
                  message.isBot 
                    ? "bg-muted text-foreground" 
                    : "bg-primary text-primary-foreground ml-auto"
                )}
              >
                <p className="text-sm">{message.content}</p>
              </div>
            ))}
            
            {isTyping && (
              <div className="bg-muted rounded-2xl px-4 py-3 max-w-[85%]">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  updateLastActivity();
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center 
                           hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground mb-2">Suas conversas</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Inicie uma nova conversa com nossa equipe
          </p>
          <button
            onClick={() => {
              setShowConversation(true);
              updateLastActivity();
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Nova conversa
          </button>
        </div>
      )}
    </div>
  );

  const renderHelpTab = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <HelpCircle className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-foreground mb-2">Central de Ajuda</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Encontre respostas para suas dúvidas
      </p>
      {config.help_url && (
        <a
          href={config.help_url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Acessar Central
        </a>
      )}
    </div>
  );

  const positionClasses = config.position === 'bottom-left' 
    ? 'left-4 sm:left-6' 
    : 'right-4 sm:right-6';

  return (
    <>
      {/* Floating Button - hidden in preview mode */}
      {!previewMode && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "fixed bottom-4 sm:bottom-6 z-50 w-14 h-14 rounded-full shadow-lg",
            "bg-primary text-primary-foreground hover:scale-105 transition-all duration-200",
            "flex items-center justify-center",
            positionClasses
          )}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageCircle className="w-6 h-6" />
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={cn(
            "bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col",
            previewMode 
              ? "relative w-full h-[480px]" 
              : cn("fixed bottom-20 sm:bottom-24 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[500px] sm:h-[560px] animate-scale-in", positionClasses)
          )}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {config.logo_url ? (
                  <img 
                    src={config.logo_url} 
                    alt="Logo" 
                    className="w-10 h-10 rounded-xl object-cover bg-white/10"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-white">{config.title || 'Suporte'}</h3>
                  <p className="text-xs text-white/70">{config.subtitle || 'Estamos online'}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'home' && renderHomeTab()}
            {activeTab === 'messages' && renderMessagesTab()}
            {activeTab === 'help' && renderHelpTab()}
          </div>

          {/* Bottom Navigation */}
          {config.show_bottom_nav && (
            <div className="flex justify-around py-3 border-t border-border bg-card">
              <button 
                onClick={() => { setActiveTab('home'); setShowConversation(false); }}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-colors",
                  activeTab === 'home' ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Home className="w-5 h-5" />
                <span className="text-xs font-medium">Início</span>
              </button>
              <button 
                onClick={() => setActiveTab('messages')}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-colors",
                  activeTab === 'messages' ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs font-medium">Mensagens</span>
              </button>
              <button 
                onClick={() => setActiveTab('help')}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-colors",
                  activeTab === 'help' ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <HelpCircle className="w-5 h-5" />
                <span className="text-xs font-medium">Ajuda</span>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
