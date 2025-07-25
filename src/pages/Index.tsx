import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users, Briefcase, ArrowRight, UserPlus, LogIn } from 'lucide-react';

const Index = () => {
  const { user, profile, loading, session } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if we have a valid session AND user AND profile
    if (!loading && session && user && profile) {
      console.log('Redirecting user with role:', profile.role);
      // Add a small delay to ensure state is stable
      setTimeout(() => {
        if (profile.role === 'worker') {
          navigate('/worker-dashboard');
        } else if (profile.role === 'employer') {
          navigate('/employer-dashboard');
        }
      }, 100);
    }
  }, [user, profile, loading, session, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('common.loading')}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 animate-slide-up">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-pink-600 text-white px-4 py-2 rounded-lg animate-pulse-soft">
            {t('header.title')}
          </h1>
          <div className="flex items-center space-x-2">
            <LanguageToggle />
            <Button variant="outline" asChild className="hover:shadow-pink transition-all duration-300 hover:scale-105">
              <Link to="/login">
                <LogIn className="mr-2 h-4 w-4" />
                {t('header.signIn')}
              </Link>
            </Button>
            <Button asChild className="gradient-primary hover:shadow-glow transition-all duration-300 hover:scale-105">
              <Link to="/register">
                <UserPlus className="mr-2 h-4 w-4" />
                {t('header.signUp')}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 text-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 gradient-hero"></div>
        <div className="absolute top-10 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-float"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-primary/15 rounded-full blur-lg animate-pulse-soft"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 text-black animate-slide-up">
            {t('hero.title')}
          </h1>
          <p className="text-xl text-black mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in-delayed">
            {t('hero.subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-delayed" style={{ animationDelay: '0.6s' }}>
            <Button size="lg" asChild className="gradient-primary shadow-glow hover:shadow-pink transition-all duration-300 hover:scale-105 text-lg px-8 py-4">
              <Link to="/register">
                {t('hero.getStarted')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="hover:shadow-pink transition-all duration-300 hover:scale-105 text-lg px-8 py-4">
              <Link to="/login">
                {t('header.signIn')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 gradient-secondary relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-4xl font-bold text-center mb-16 animate-slide-up">
            {t('features.title')}
          </h2>
          
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Workers Card */}
            <Card className="text-center shadow-pink hover:shadow-glow transition-all duration-500 hover:scale-105 animate-slide-up border-2 border-primary/20 hover:border-primary/40 bg-card/90 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="relative mb-6">
                  <Users className="w-20 h-20 mx-auto text-primary animate-float" />
                  <div className="absolute inset-0 w-20 h-20 mx-auto bg-primary/20 rounded-full blur-xl"></div>
                </div>
                <CardTitle className="text-3xl gradient-primary text-white px-4 py-2 rounded-lg shadow-glow">{t('features.workers.title')}</CardTitle>
                <CardDescription className="text-lg text-card-foreground">
                  {t('features.workers.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="text-left space-y-3 text-card-foreground text-lg">
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{t('features.workers.feature1').replace('• ', '')}</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{t('features.workers.feature2').replace('• ', '')}</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{t('features.workers.feature3').replace('• ', '')}</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{t('features.workers.feature4').replace('• ', '')}</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{t('features.workers.feature5').replace('• ', '')}</span>
                  </li>
                </ul>
                <Button className="w-full gradient-primary shadow-glow hover:shadow-pink transition-all duration-300 hover:scale-105 text-lg py-3" asChild>
                  <Link to="/register">
                    {t('features.workers.joinButton')}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Employers Card */}
            <Card className="text-center shadow-pink hover:shadow-glow transition-all duration-500 hover:scale-105 animate-slide-up border-2 border-primary/20 hover:border-primary/40 bg-card/90 backdrop-blur-sm" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="pb-6">
                <div className="relative mb-6">
                  <Briefcase className="w-20 h-20 mx-auto text-primary animate-float" style={{ animationDelay: '0.5s' }} />
                  <div className="absolute inset-0 w-20 h-20 mx-auto bg-primary/20 rounded-full blur-xl"></div>
                </div>
                <CardTitle className="text-3xl gradient-primary text-white px-4 py-2 rounded-lg shadow-glow">{t('features.employers.title')}</CardTitle>
                <CardDescription className="text-lg text-card-foreground">
                  {t('features.employers.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="text-left space-y-3 text-card-foreground text-lg">
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{t('features.employers.feature1').replace('• ', '')}</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{t('features.employers.feature2').replace('• ', '')}</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{t('features.employers.feature3').replace('• ', '')}</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{t('features.employers.feature4').replace('• ', '')}</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{t('features.employers.feature5').replace('• ', '')}</span>
                  </li>
                </ul>
                <Button className="w-full gradient-primary shadow-glow hover:shadow-pink transition-all duration-300 hover:scale-105 text-lg py-3" asChild>
                  <Link to="/register">
                    {t('features.employers.joinButton')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 text-center text-muted-foreground bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <p className="text-lg animate-fade-in">© 2025 CodeCatalyst. All rights reserved.</p>
          <p className="text-md mt-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Team: Ananya Singh, Nidhi Singh, Saru Rai, Anustha Maharjan
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
