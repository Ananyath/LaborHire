import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessagingSystem } from './MessagingSystem';
import { MessageCircle } from 'lucide-react';

interface StartChatButtonProps {
  targetUserId: string;
  jobId?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  children?: React.ReactNode;
}

export const StartChatButton = ({ 
  targetUserId, 
  jobId, 
  variant = 'default', 
  size = 'default',
  children 
}: StartChatButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          {children || (
            <>
              <MessageCircle className="w-4 h-4 mr-2" />
              Start Chat
            </>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl h-[700px] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Messages</DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pb-6 h-full">
          <MessagingSystem 
            startConversationWith={targetUserId}
            jobId={jobId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};