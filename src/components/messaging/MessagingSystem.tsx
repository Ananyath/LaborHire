
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Send, 
  MessageCircle, 
  Users,
  Search
} from 'lucide-react';

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  job_id?: string;
  last_message_at?: string;
  participant_profile: {
    id: string;
    full_name: string;
    profile_photo_url?: string;
    company_name?: string;
  };
  unread_count: number;
  last_message?: {
    message_text?: string;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  message_text?: string;
  is_read: boolean;
  created_at: string;
  job_id?: string;
}

interface MessagingSystemProps {
  startConversationWith?: string;
  jobId?: string;
}

export const MessagingSystem = ({ startConversationWith, jobId }: MessagingSystemProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [jobTitles, setJobTitles] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      fetchConversations();
      setupRealtimeSubscription();
    }
  }, [profile]);

  useEffect(() => {
    if (startConversationWith && profile) {
      startNewConversation(startConversationWith, jobId);
    }
  }, [startConversationWith, profile, jobId]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
      markMessagesAsRead(selectedConversation);
    }
  }, [selectedConversation]);

  // Fetch job titles for messages with job context
  useEffect(() => {
    const fetchJobTitles = async () => {
      const uniqueJobIds = [...new Set(messages.filter(m => m.job_id).map(m => m.job_id!))];
      if (uniqueJobIds.length === 0) return;

      try {
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id, title')
          .in('id', uniqueJobIds);

        if (jobs) {
          const jobTitleMap = jobs.reduce((acc, job) => {
            acc[job.id] = job.title;
            return acc;
          }, {} as Record<string, string>);
          setJobTitles(jobTitleMap);
        }
      } catch (error) {
        console.error('Error fetching job titles:', error);
      }
    };

    fetchJobTitles();
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const setupRealtimeSubscription = () => {
    console.log('Setting up realtime subscription for user:', profile?.id);
    
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('Real-time message received:', payload);
          const newMessage = payload.new as Message;
          
          // Only add to UI if this is from another user (not our own message)
          if (newMessage.sender_id !== profile?.id) {
            // Update messages if this is for the current conversation
            if (newMessage.conversation_id === selectedConversation) {
              setMessages(prev => {
                // Avoid duplicates
                const exists = prev.some(msg => msg.id === newMessage.id);
                if (exists) return prev;
                return [...prev, newMessage];
              });
              
              // Mark as read if user is not the sender
              markMessagesAsRead(selectedConversation);
            }
            
            // Update conversation list with new message
            setConversations(prev => prev.map(conv => 
              conv.id === newMessage.conversation_id
                ? { 
                    ...conv, 
                    last_message: { message_text: newMessage.message_text },
                    last_message_at: newMessage.created_at,
                    unread_count: conv.id === selectedConversation ? 0 : (conv.unread_count + 1)
                  }
                : conv
            ));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('Real-time message updated:', payload);
          const updatedMessage = payload.new as Message;
          
          // Update messages if this is for the current conversation
          if (updatedMessage.conversation_id === selectedConversation) {
            setMessages(prev => prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            ));
          }
          
          // Refresh conversations to update unread counts
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('Real-time conversation updated:', payload);
          // Refresh conversations when any conversation is updated
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  };

  const fetchConversations = async () => {
    if (!profile?.id) return;

    console.log('Fetching conversations for profile ID:', profile.id);

    try {
      // Get all conversations where the user is a participant
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${profile.id},participant_2.eq.${profile.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }
      
      console.log('Raw conversations data:', data);
      
      if (!data || data.length === 0) {
        console.log('No conversations found for user');
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get unread message counts and last messages for each conversation
      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (conv: any) => {
          const otherParticipantId = conv.participant_1 === profile.id ? conv.participant_2 : conv.participant_1;
          
          console.log(`Processing conversation ${conv.id}, other participant: ${otherParticipantId}`);
          
          // Get other participant's profile
          const { data: otherProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, profile_photo_url, company_name')
            .eq('id', otherParticipantId)
            .single();

          if (profileError) {
            console.error('Error fetching profile for participant:', otherParticipantId, profileError);
            return null; // Skip this conversation if we can't get the profile
          }
          
          console.log('Other participant profile:', otherProfile);

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('receiver_id', profile.id)
            .eq('is_read', false);

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('message_text')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const conversationWithDetails = {
            ...conv,
            participant_profile: otherProfile,
            unread_count: unreadCount || 0,
            last_message: lastMessage
          };
          
          console.log('Conversation with details:', conversationWithDetails);
          
          return conversationWithDetails;
        })
      );

      // Filter out any null conversations (where profile fetch failed)
      const validConversations = conversationsWithDetails.filter(conv => conv !== null);
      console.log('Valid conversations with details:', validConversations);
      setConversations(validConversations);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages.',
        variant: 'destructive',
      });
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('receiver_id', profile.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking messages as read:', error);
        return;
      }

      // Update local conversation state
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  };

  const startNewConversation = async (otherParticipantId: string, jobId?: string) => {
    if (!profile?.id || otherParticipantId === profile.id) return;

    try {
      // First, look for a general conversation (unified conversation without job_id)
      const { data: generalConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${profile.id},participant_2.eq.${otherParticipantId}),and(participant_1.eq.${otherParticipantId},participant_2.eq.${profile.id})`)
        .is('job_id', null)
        .maybeSingle();

      if (generalConv) {
        setSelectedConversation(generalConv.id);
        return;
      }

      // If no general conversation exists, look for any conversation between these users
      const { data: anyConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${profile.id},participant_2.eq.${otherParticipantId}),and(participant_1.eq.${otherParticipantId},participant_2.eq.${profile.id})`)
        .limit(1)
        .maybeSingle();

      if (anyConv) {
        // Convert this conversation to a general one
        await supabase
          .from('conversations')
          .update({ job_id: null })
          .eq('id', anyConv.id);
        
        setSelectedConversation(anyConv.id);
        fetchConversations();
        return;
      }

      // Create new unified conversation (without job_id)
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          participant_1: profile.id,
          participant_2: otherParticipantId,
          job_id: null // Always create as unified conversation
        })
        .select()
        .single();

      if (error) throw error;

      setSelectedConversation(newConv.id);
      fetchConversations();
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation.',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !profile?.id || !newMessage.trim()) return;

    const conversation = conversations.find(c => c.id === selectedConversation);
    if (!conversation) return;

    const receiverId = conversation.participant_1 === profile.id 
      ? conversation.participant_2 
      : conversation.participant_1;

    const messageText = newMessage.trim();
    
    // Create temporary message for immediate UI update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation,
      sender_id: profile.id,
      receiver_id: receiverId,
      message_text: messageText,
      is_read: false,
      created_at: new Date().toISOString(),
      job_id: jobId
    };

    // Immediately add message to UI for instant feedback
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: profile.id,
          receiver_id: receiverId,
          message_text: messageText,
          job_id: jobId
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temporary message with real message from database
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? data : msg
      ));

      // Update conversation's last message and timestamp
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation 
          ? { 
              ...conv, 
              last_message: { message_text: messageText },
              last_message_at: data.created_at 
            }
          : conv
      ));
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setNewMessage(messageText); // Restore the message text
      
      toast({
        title: 'Error',
        description: 'Failed to send message.',
        variant: 'destructive',
      });
    }
  };


  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.participant_profile?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.participant_profile?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Conversations List */}
      <div className="w-1/3 border-r bg-card">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-2 mb-3">
            <MessageCircle className="h-5 w-5" />
            <h3 className="font-semibold">Messages</h3>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="h-[500px]">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {conversations.length === 0 ? 'No conversations yet' : 'No matches found'}
              </p>
              <p className="text-xs mt-2">
                {conversations.length === 0 
                  ? 'Start a conversation by applying to jobs and contacting employers'
                  : 'Try a different search term'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConversation === conversation.id
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={conversation.participant_profile?.profile_photo_url || ''} />
                      <AvatarFallback>
                        {conversation.participant_profile?.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {conversation.participant_profile?.full_name}
                        </p>
                        {conversation.unread_count > 0 && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                      
                      {conversation.participant_profile?.company_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.participant_profile.company_name}
                        </p>
                      )}
                      
                       {conversation.last_message && (
                         <p className="text-xs text-muted-foreground truncate mt-1">
                           {conversation.last_message.message_text}
                         </p>
                       )}
                      
                      {conversation.last_message_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(conversation.last_message_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            {(() => {
              const conversation = conversations.find(c => c.id === selectedConversation);
              return conversation ? (
                <div className="p-4 border-b bg-card">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={conversation.participant_profile?.profile_photo_url || ''} />
                      <AvatarFallback>
                        {conversation.participant_profile?.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{conversation.participant_profile?.full_name}</h4>
                      {conversation.participant_profile?.company_name && (
                        <p className="text-sm text-muted-foreground">
                          {conversation.participant_profile.company_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === profile?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_id === profile?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                       {message.job_id && jobTitles[message.job_id] && (
                        <div className="mb-2">
                          <Badge variant="secondary" className="text-xs">
                            📋 {jobTitles[message.job_id]}
                          </Badge>
                        </div>
                      )}
                      
                       {message.message_text && (
                         <p className="text-sm">{message.message_text}</p>
                       )}
                      
                      <p className="text-xs opacity-70 mt-1">
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-card">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1"
                />
                
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
