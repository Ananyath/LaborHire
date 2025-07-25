import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: '' as 'worker' | 'employer' | '',
  });
  const [validationErrors, setValidationErrors] = useState({
    fullName: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateFullName = (value: string) => {
    const alphabeticPattern = /^[a-zA-Z\s]*$/;
    if (!alphabeticPattern.test(value)) {
      return 'Full name can only contain letters and spaces';
    }
    return '';
  };

  const validatePhone = (value: string) => {
    const numericPattern = /^\d*$/;
    if (!numericPattern.test(value)) {
      return 'Phone number can only contain digits';
    }
    if (value.length > 10) {
      return 'Phone number must be exactly 10 digits';
    }
    if (value.length > 0 && value.length < 10) {
      return 'Phone number must be exactly 10 digits';
    }
    if (value.length > 0 && !value.startsWith('9')) {
      return 'Phone number must start with digit 9';
    }
    return '';
  };

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;
    let error = '';

    if (field === 'fullName') {
      error = validateFullName(value);
      // Only update if the input is valid or empty
      if (error && value !== '') {
        return; // Don't update the field if it's invalid
      }
    }

    if (field === 'phone') {
      // Only allow numeric input and limit to 10 digits
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 10) {
        processedValue = numericValue;
        error = validatePhone(numericValue);
      } else {
        return; // Don't update if more than 10 digits
      }
    }

    setFormData(prev => ({ ...prev, [field]: processedValue }));
    setValidationErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Weak password',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.role) {
      toast({
        title: 'Role required',
        description: 'Please select your role (Worker or Employer).',
        variant: 'destructive',
      });
      return;
    }

    if (formData.phone && formData.phone.length !== 10) {
      toast({
        title: 'Invalid phone number',
        description: 'Phone number must be exactly 10 digits.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(formData.email, formData.password, {
        fullName: formData.fullName,
        role: formData.role,
        phone: formData.phone,
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: 'Account exists',
            description: 'An account with this email already exists. Please sign in instead.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Registration failed',
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Account created!',
          description: 'Your account has been created successfully. Welcome to Labor Hire System!',
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Create Account" 
      description="Join Labor Hire System as a Worker or Employer."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            required
            className={validationErrors.fullName ? 'border-destructive' : ''}
          />
          {validationErrors.fullName && (
            <p className="text-sm text-destructive">{validationErrors.fullName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground bg-muted px-2 py-1 rounded text-sm pointer-events-none">
              +977
            </div>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter 10-digit phone number"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={`pl-16 ${validationErrors.phone ? 'border-destructive' : ''}`}
              maxLength={10}
            />
          </div>
          {validationErrors.phone && (
            <p className="text-sm text-destructive">{validationErrors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select onValueChange={(value) => handleInputChange('role', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="worker">Worker</SelectItem>
              <SelectItem value="employer">Employer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>
      </form>

      <div className="mt-6 text-center">
        <div className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Register;