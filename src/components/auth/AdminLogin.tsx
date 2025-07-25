import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (username !== 'admin' || password !== 'Admin@123') {
      toast({
        title: "Invalid Credentials",
        description: "Please check your username and password.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Try to sign in first
      const { error: signInError } = await signIn('admin@system.local', 'Admin@123');
      
      if (signInError && signInError.message.includes('Invalid login credentials')) {
        // If sign in fails, create the admin account
        const { error: signUpError } = await signUp('admin@system.local', 'Admin@123', {
          fullName: 'admin',
          role: 'employer',
          phone: '0000000000'
        });
        
        if (signUpError) {
          toast({
            title: "Error",
            description: signUpError.message,
            variant: "destructive"
          });
          return;
        }

        // Sign in after creating account
        const { error: secondSignInError } = await signIn('admin@system.local', 'Admin@123');
        if (secondSignInError) {
          toast({
            title: "Error",
            description: secondSignInError.message,
            variant: "destructive"
          });
          return;
        }
      } else if (signInError) {
        toast({
          title: "Error",
          description: signInError.message,
          variant: "destructive"
        });
        return;
      }

      // Set hardcoded admin session flag
      localStorage.setItem('hardcoded_admin_session', 'admin-user');
      
      toast({
        title: "Success",
        description: "Welcome, admin!"
      });
      
      // Add a small delay to ensure auth state is updated
      setTimeout(() => {
        navigate('/admin-dashboard');
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Admin Access</CardTitle>
          <CardDescription>Sign in to access the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};