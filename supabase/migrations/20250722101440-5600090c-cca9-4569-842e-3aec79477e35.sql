-- Add missing foreign key relationships for payments table
ALTER TABLE public.payments 
ADD CONSTRAINT payments_payer_id_fkey 
FOREIGN KEY (payer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.payments 
ADD CONSTRAINT payments_payee_id_fkey 
FOREIGN KEY (payee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add missing foreign key relationships for conversations table
ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_participant_1_fkey 
FOREIGN KEY (participant_1) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_participant_2_fkey 
FOREIGN KEY (participant_2) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add missing foreign key relationships for messages table
ALTER TABLE public.messages 
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_receiver_id_fkey 
FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Insert dummy data for wallets - create wallets for first few profiles
INSERT INTO public.wallets (user_id, balance, total_earned, total_spent) 
SELECT id, 
       CASE 
         WHEN role = 'employer' THEN 50000.00 
         ELSE FLOOR(RANDOM() * 5000) + 1000.00 
       END as balance,
       CASE 
         WHEN role = 'worker' THEN FLOOR(RANDOM() * 10000) + 2000.00 
         ELSE 0.00 
       END as total_earned,
       CASE 
         WHEN role = 'employer' THEN FLOOR(RANDOM() * 8000) + 1000.00 
         ELSE 0.00 
       END as total_spent
FROM public.profiles 
WHERE NOT EXISTS (
  SELECT 1 FROM public.wallets WHERE wallets.user_id = profiles.id
)
LIMIT 10;