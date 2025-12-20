import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Phone, HelpCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TeamAvatar {
  name: string;
  url: string;
}

interface ChatWidgetConfig {
  is_enabled: boolean;
  title: string;
  subtitle: string;
  primary_color: string;
  icon_type: string;
  show_whatsapp_button: boolean;
  whatsapp_number: string | null;
  whatsapp_label: string;
  show_help_button: boolean;
  help_url: string | null;
  help_label: string;
  team_avatars: TeamAvatar[];
  position: string;
  welcome_message: string;
  show_typing_indicator: boolean;
  typing_delay_ms: number;
}

interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
}

interface ChatWidgetProps {
  config: ChatWidgetConfig;
}

export function ChatWidget({ config }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Show welcome message when chat opens
  useEffect(() => {
    if (isOpen && !hasShownWelcome && config.welcome_message) {
      setHasShownWelcome(true);
      
      if (config.show_typing_indicator) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages([{
            id: "welcome",
            content: config.welcome_message,
            isBot: true,
            timestamp: new Date()
          }]);
        }, config.typing_delay_ms);
      } else {
        setMessages([{
          id: "welcome",
          content: config.welcome_message,
          isBot: true,
          timestamp: new Date()
        }]);
      }
    }
  }, [isOpen, hasShownWelcome, config]);

  const handleWhatsAppClick = () => {
    if (config.whatsapp_number) {
      const cleanNumber = config.whatsapp_number.replace(/\D/g, "");
      window.open(`https://wa.me/${cleanNumber}`, "_blank");
    }
  };

  const handleHelpClick = () => {
    if (config.help_url) {
      window.open(config.help_url, "_blank");
    }
  };

  if (!config.is_enabled) return null;

  const positionClasses = {
    "bottom-right": "bottom-4 right-4 sm:bottom-6 sm:right-6",
    "bottom-left": "bottom-4 left-4 sm:bottom-6 sm:left-6",
  };

  const position = positionClasses[config.position as keyof typeof positionClasses] || positionClasses["bottom-right"];

  return (
    <div className={cn("fixed z-50", position)}>
      {/* Chat Popup */}
      {isOpen && (
        <div 
          className="mb-4 w-[calc(100vw-2rem)] sm:w-80 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300"
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          {/* Header */}
          <div 
            className="p-4 text-white relative overflow-hidden"
            style={{ backgroundColor: config.primary_color }}
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/20" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/20" />
            </div>
            
            <div className="relative flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs opacity-90">Online</span>
                </div>
                <h3 className="font-bold text-lg">{config.title}</h3>
                <p className="text-sm opacity-90">{config.subtitle}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Team Avatars */}
            {config.team_avatars && config.team_avatars.length > 0 && (
              <div className="flex items-center mt-3 -space-x-2">
                {config.team_avatars.slice(0, 4).map((avatar, index) => (
                  <div
                    key={index}
                    className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-white/20"
                    title={avatar.name}
                  >
                    {avatar.url ? (
                      <img 
                        src={avatar.url} 
                        alt={avatar.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold">
                        {avatar.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
                {config.team_avatars.length > 4 && (
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-white/30 flex items-center justify-center text-xs font-bold">
                    +{config.team_avatars.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div className="h-48 sm:h-56 overflow-y-auto p-4 bg-muted/30 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.isBot ? "justify-start" : "justify-end"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] px-4 py-2.5 rounded-2xl text-sm",
                    message.isBot
                      ? "bg-card border border-border rounded-bl-sm"
                      : "text-white rounded-br-sm"
                  )}
                  style={!message.isBot ? { backgroundColor: config.primary_color } : undefined}
                >
                  {message.content}
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Action Buttons */}
          <div className="p-3 bg-card border-t border-border space-y-2">
            {config.show_whatsapp_button && config.whatsapp_number && (
              <Button
                onClick={handleWhatsAppClick}
                className="w-full gap-2 bg-green-500 hover:bg-green-600 text-white"
              >
                <Phone className="h-4 w-4" />
                {config.whatsapp_label}
              </Button>
            )}
            
            {config.show_help_button && config.help_url && (
              <Button
                onClick={handleHelpClick}
                variant="outline"
                className="w-full gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                {config.help_label}
              </Button>
            )}
            
            {!config.show_whatsapp_button && !config.show_help_button && (
              <p className="text-center text-sm text-muted-foreground py-2">
                Como podemos ajudar você?
              </p>
            )}
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110",
          isOpen && "rotate-90"
        )}
        style={{ backgroundColor: config.primary_color }}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </button>
    </div>
  );
}