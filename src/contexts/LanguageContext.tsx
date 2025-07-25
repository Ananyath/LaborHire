import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ne';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // Header
    'header.title': 'Labor Hire System',
    'header.signIn': 'Sign In',
    'header.signUp': 'Sign Up',
    
    // Hero Section
    'hero.title': 'Connect Workers with Employers',
    'hero.subtitle': 'The premier platform for skilled workers to find employment opportunities and for employers to discover talented professionals.',
    'hero.getStarted': 'Get Started',
    
    // Features Section
    'features.title': 'Join as a Worker or Employer',
    'features.workers.title': 'For Workers',
    'features.workers.subtitle': 'Find your next opportunity and showcase your skills',
    'features.workers.feature1': '• Create a professional profile',
    'features.workers.feature2': '• Upload your resume and portfolio',
    'features.workers.feature3': '• Set your availability status',
    'features.workers.feature4': '• Connect with employers',
    'features.workers.feature5': '• Manage multiple languages',
    'features.workers.joinButton': 'Join as Worker',
    
    'features.employers.title': 'For Employers',
    'features.employers.subtitle': 'Find skilled workers for your projects and business needs',
    'features.employers.feature1': '• Post job opportunities',
    'features.employers.feature2': '• Search qualified workers',
    'features.employers.feature3': '• Review applications and resumes',
    'features.employers.feature4': '• Manage hiring process',
    'features.employers.feature5': '• Build your team',
    'features.employers.joinButton': 'Join as Employer',
    
    // Footer
    'footer.copyright': '© 2024 Labor Hire System. All rights reserved.',
    'footer.adminAccess': 'Admin Access',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.actions': 'Actions',
    'common.status': 'Status',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.submit': 'Submit',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.warning': 'Warning',
    'common.info': 'Info',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.profile': 'Profile',
    'nav.jobs': 'Jobs',
    'nav.applications': 'Applications',
    'nav.messages': 'Messages',
    'nav.wallet': 'Wallet',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    'nav.admin': 'Admin',
    
    // Dashboard - Common
    'dashboard.welcome': 'Welcome',
    'dashboard.overview': 'Overview',
    'dashboard.statistics': 'Statistics',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.quickActions': 'Quick Actions',
    
    // Worker Dashboard
    'worker.dashboard.title': 'Worker Dashboard',
    'worker.dashboard.subtitle': 'Manage your profile, find jobs, and track applications',
    'worker.profile.title': 'Profile',
    'worker.profile.edit': 'Edit Profile',
    'worker.profile.availability': 'Availability Status',
    'worker.profile.skills': 'Skills',
    'worker.profile.documents': 'Documents & Certifications',
    'worker.profile.resume': 'Resume/CV',
    'worker.profile.identity': 'Identity Document',
    'worker.profile.photo': 'Profile Photo',
    'worker.profile.certifications': 'Professional Certifications',
    'worker.jobs.browse': 'Browse Jobs',
    'worker.jobs.applied': 'My Applications',
    'worker.jobs.saved': 'Saved Jobs',
    'worker.applications.pending': 'Pending',
    'worker.applications.accepted': 'Accepted',
    'worker.applications.rejected': 'Rejected',
    'worker.messages.title': 'Messages',
    'worker.messages.noMessages': 'No messages yet',
    'worker.wallet.title': 'Wallet',
    'worker.wallet.balance': 'Balance',
    'worker.wallet.earnings': 'Total Earnings',
    
    // Employer Dashboard
    'employer.dashboard.title': 'Employer Dashboard',
    'employer.dashboard.subtitle': 'Post jobs, find workers, and manage your hiring process',
    'employer.profile.title': 'Company Profile',
    'employer.profile.company': 'Company Name',
    'employer.profile.description': 'Company Description',
    'employer.jobs.title': 'Job Management',
    'employer.jobs.post': 'Post New Job',
    'employer.jobs.active': 'Active Jobs',
    'employer.jobs.draft': 'Draft Jobs',
    'employer.jobs.closed': 'Closed Jobs',
    'employer.jobs.applications': 'Applications',
    'employer.workers.title': 'Find Workers',
    'employer.workers.search': 'Search Workers',
    'employer.workers.browse': 'Browse Workers',
    'employer.hiring.title': 'Hiring Process',
    'employer.hiring.pending': 'Pending Reviews',
    'employer.hiring.hired': 'Hired Workers',
    
    // Admin Dashboard
    'admin.dashboard.title': 'Admin Dashboard',
    'admin.dashboard.subtitle': 'Manage platform operations and monitor system health',
    'admin.users.title': 'User Management',
    'admin.users.all': 'All Users',
    'admin.users.workers': 'Workers',
    'admin.users.employers': 'Employers',
    'admin.users.admins': 'Admin Users',
    'admin.users.verification': 'Verification',
    'admin.users.approval': 'Approval',
    'admin.users.resetPassword': 'Reset Password',
    'admin.analytics.title': 'Analytics',
    'admin.analytics.platform': 'Platform Analytics',
    'admin.analytics.users': 'User Statistics',
    'admin.analytics.jobs': 'Job Statistics',
    'admin.system.title': 'System',
    'admin.system.settings': 'System Settings',
    'admin.system.logs': 'Activity Logs',
    
    // Forms
    'form.required': 'Required',
    'form.optional': 'Optional',
    'form.name': 'Name',
    'form.email': 'Email',
    'form.phone': 'Phone',
    'form.address': 'Address',
    'form.description': 'Description',
    'form.title': 'Title',
    'form.skills': 'Skills',
    'form.location': 'Location',
    'form.payRate': 'Pay Rate',
    'form.duration': 'Duration',
    'form.deadline': 'Deadline',
    'form.requirements': 'Requirements',
    'form.upload': 'Upload',
    'form.download': 'Download',
    'form.remove': 'Remove',
    
    // Job related
    'job.title': 'Job Title',
    'job.description': 'Job Description',
    'job.location': 'Location',
    'job.payRate': 'Pay Rate',
    'job.duration': 'Duration',
    'job.deadline': 'Application Deadline',
    'job.requirements': 'Requirements',
    'job.skills': 'Required Skills',
    'job.status.open': 'Open',
    'job.status.closed': 'Closed',
    'job.status.draft': 'Draft',
    'job.apply': 'Apply Now',
    'job.applied': 'Applied',
    'job.viewDetails': 'View Details',
    'job.contactEmployer': 'Contact Employer',
    
    // Application related
    'application.status.pending': 'Pending',
    'application.status.accepted': 'Accepted',
    'application.status.rejected': 'Rejected',
    'application.coverLetter': 'Cover Letter',
    'application.appliedDate': 'Applied Date',
    'application.viewApplication': 'View Application',
    'application.approve': 'Approve',
    'application.reject': 'Reject',
    
    // Messages
    'messages.sendMessage': 'Send Message',
    'messages.typeMessage': 'Type your message...',
    'messages.conversation': 'Conversation',
    'messages.startChat': 'Start Chat',
    'messages.noConversations': 'No conversations yet',
    
    // Wallet & Payments
    'wallet.balance': 'Current Balance',
    'wallet.totalEarned': 'Total Earned',
    'wallet.totalSpent': 'Total Spent',
    'wallet.topUp': 'Top Up',
    'wallet.withdraw': 'Withdraw',
    'wallet.transactions': 'Transaction History',
    'wallet.payment.pending': 'Pending',
    'wallet.payment.completed': 'Completed',
    'wallet.payment.failed': 'Failed',
    
    // Status badges
    'status.online': 'Online',
    'status.offline': 'Offline',
    'status.busy': 'Busy',
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.suspended': 'Suspended',
    'status.banned': 'Banned',
    'status.verified': 'Verified',
    'status.unverified': 'Unverified',
    'status.approved': 'Approved',
    'status.rejected': 'Rejected',
    'status.pending': 'Pending',
    
    // Notifications
    'notification.profileUpdated': 'Profile updated successfully',
    'notification.jobPosted': 'Job posted successfully',
    'notification.applicationSubmitted': 'Application submitted successfully',
    'notification.messagesSent': 'Message sent successfully',
    'notification.paymentProcessed': 'Payment processed successfully',
    'notification.userVerified': 'User verified successfully',
    'notification.passwordReset': 'Password reset email sent',
    
    // Errors
    'error.generic': 'Something went wrong',
    'error.network': 'Network error',
    'error.unauthorized': 'Unauthorized access',
    'error.notFound': 'Not found',
    'error.validation': 'Validation error',
    'error.uploadFailed': 'File upload failed',
    'error.insufficientBalance': 'Insufficient balance',
  },
  ne: {
    // Header
    'header.title': 'श्रम भर्ती प्रणाली',
    'header.signIn': 'साइन इन',
    'header.signUp': 'साइन अप',
    
    // Hero Section
    'hero.title': 'कामदारहरूलाई नियोक्ताहरूसँग जोड्नुहोस्',
    'hero.subtitle': 'दक्ष कामदारहरूको लागि रोजगारका अवसरहरू फेला पार्न र नियोक्ताहरूको लागि प्रतिभाशाली पेशेवरहरू खोज्नको लागि प्रमुख प्लेटफर्म।',
    'hero.getStarted': 'सुरु गर्नुहोस्',
    
    // Features Section
    'features.title': 'कामदार वा नियोक्ताको रूपमा सामेल हुनुहोस्',
    'features.workers.title': 'कामदारहरूको लागि',
    'features.workers.subtitle': 'आफ्नो अर्को अवसर फेला पार्नुहोस् र आफ्ना सीपहरू प्रदर्शन गर्नुहोस्',
    'features.workers.feature1': '• व्यावसायिक प्रोफाइल सिर्जना गर्नुहोस्',
    'features.workers.feature2': '• आफ्नो रिज्युमे र पोर्टफोलियो अपलोड गर्नुहोस्',
    'features.workers.feature3': '• आफ्नो उपलब्धता स्थिति सेट गर्नुहोस्',
    'features.workers.feature4': '• नियोक्ताहरूसँग जडान गर्नुहोस्',
    'features.workers.feature5': '• बहुभाषा व्यवस्थापन गर्नुहोस्',
    'features.workers.joinButton': 'कामदारको रूपमा सामेल हुनुहोस्',
    
    'features.employers.title': 'नियोक्ताहरूको लागि',
    'features.employers.subtitle': 'आफ्नो परियोजना र व्यापारिक आवश्यकताहरूको लागि दक्ष कामदारहरू फेला पार्नुहोस्',
    'features.employers.feature1': '• काम अवसरहरू पोस्ट गर्नुहोस्',
    'features.employers.feature2': '• योग्य कामदारहरू खोज्नुहोस्',
    'features.employers.feature3': '• आवेदन र रिज्युमेहरू समीक्षा गर्नुहोस्',
    'features.employers.feature4': '• भर्ती प्रक्रिया व्यवस्थापन गर्नुहोस्',
    'features.employers.feature5': '• आफ्नो टोली निर्माण गर्नुहोस्',
    'features.employers.joinButton': 'नियोक्ताको रूपमा सामेल हुनुहोस्',
    
    // Footer
    'footer.copyright': '© २०२४ श्रम भर्ती प्रणाली। सबै अधिकार सुरक्षित।',
    'footer.adminAccess': 'प्रशासक पहुँच',
    
    // Common
    'common.loading': 'लोड गर्दै...',
    'common.save': 'सेभ गर्नुहोस्',
    'common.cancel': 'रद्द गर्नुहोस्',
    'common.delete': 'मेटाउनुहोस्',
    'common.edit': 'सम्पादन गर्नुहोस्',
    'common.view': 'हेर्नुहोस्',
    'common.search': 'खोज्नुहोस्',
    'common.filter': 'फिल्टर गर्नुहोस्',
    'common.actions': 'कार्यहरू',
    'common.status': 'स्थिति',
    'common.yes': 'हो',
    'common.no': 'होइन',
    'common.submit': 'पेश गर्नुहोस्',
    'common.close': 'बन्द गर्नुहोस्',
    'common.confirm': 'पुष्टि गर्नुहोस्',
    'common.success': 'सफल',
    'common.error': 'त्रुटि',
    'common.warning': 'चेतावनी',
    'common.info': 'जानकारी',
    
    // Navigation
    'nav.dashboard': 'ड्यासबोर्ड',
    'nav.profile': 'प्रोफाइल',
    'nav.jobs': 'कामहरू',
    'nav.applications': 'आवेदनहरू',
    'nav.messages': 'सन्देशहरू',
    'nav.wallet': 'वालेट',
    'nav.settings': 'सेटिङहरू',
    'nav.logout': 'लगआउट',
    'nav.admin': 'प्रशासक',
    
    // Dashboard - Common
    'dashboard.welcome': 'स्वागत छ',
    'dashboard.overview': 'सिंहावलोकन',
    'dashboard.statistics': 'तथ्याङ्कहरू',
    'dashboard.recentActivity': 'हालका गतिविधिहरू',
    'dashboard.quickActions': 'द्रुत कार्यहरू',
    
    // Worker Dashboard
    'worker.dashboard.title': 'कामदार ड्यासबोर्ड',
    'worker.dashboard.subtitle': 'आफ्नो प्रोफाइल व्यवस्थापन गर्नुहोस्, कामहरू फेला पार्नुहोस्, र आवेदनहरू ट्र्याक गर्नुहोस्',
    'worker.profile.title': 'प्रोफाइल',
    'worker.profile.edit': 'प्रोफाइल सम्पादन गर्नुहोस्',
    'worker.profile.availability': 'उपलब्धता स्थिति',
    'worker.profile.skills': 'सीपहरू',
    'worker.profile.documents': 'कागजातहरू र प्रमाणपत्रहरू',
    'worker.profile.resume': 'रिज्युमे/सीभी',
    'worker.profile.identity': 'पहिचान कागजात',
    'worker.profile.photo': 'प्रोफाइल फोटो',
    'worker.profile.certifications': 'व्यावसायिक प्रमाणपत्रहरू',
    'worker.jobs.browse': 'कामहरू ब्राउज गर्नुहोस्',
    'worker.jobs.applied': 'मेरा आवेदनहरू',
    'worker.jobs.saved': 'सेभ गरिएका कामहरू',
    'worker.applications.pending': 'पेन्डिङ',
    'worker.applications.accepted': 'स्वीकृत',
    'worker.applications.rejected': 'अस्वीकृत',
    'worker.messages.title': 'सन्देशहरू',
    'worker.messages.noMessages': 'अहिलेसम्म कुनै सन्देश छैन',
    'worker.wallet.title': 'वालेट',
    'worker.wallet.balance': 'बैलेन्स',
    'worker.wallet.earnings': 'कुल आम्दानी',
    
    // Employer Dashboard
    'employer.dashboard.title': 'नियोक्ता ड्यासबोर्ड',
    'employer.dashboard.subtitle': 'कामहरू पोस्ट गर्नुहोस्, कामदारहरू फेला पार्नुहोस्, र आफ्नो भर्ती प्रक्रिया व्यवस्थापन गर्नुहोस्',
    'employer.profile.title': 'कम्पनी प्रोफाइल',
    'employer.profile.company': 'कम्पनीको नाम',
    'employer.profile.description': 'कम्पनीको विवरण',
    'employer.jobs.title': 'काम व्यवस्थापन',
    'employer.jobs.post': 'नयाँ काम पोस्ट गर्नुहोस्',
    'employer.jobs.active': 'सक्रिय कामहरू',
    'employer.jobs.draft': 'ड्राफ्ट कामहरू',
    'employer.jobs.closed': 'बन्द कामहरू',
    'employer.jobs.applications': 'आवेदनहरू',
    'employer.workers.title': 'कामदारहरू फेला पार्नुहोस्',
    'employer.workers.search': 'कामदारहरू खोज्नुहोस्',
    'employer.workers.browse': 'कामदारहरू ब्राउज गर्नुहोस्',
    'employer.hiring.title': 'भर्ती प्रक्रिया',
    'employer.hiring.pending': 'पेन्डिङ समीक्षाहरू',
    'employer.hiring.hired': 'भर्ना गरिएका कामदारहरू',
    
    // Admin Dashboard
    'admin.dashboard.title': 'प्रशासक ड्यासबोर्ड',
    'admin.dashboard.subtitle': 'प्लेटफर्म सञ्चालन व्यवस्थापन गर्नुहोस् र प्रणालीको स्वास्थ्य निगरानी गर्नुहोस्',
    'admin.users.title': 'प्रयोगकर्ता व्यवस्थापन',
    'admin.users.all': 'सबै प्रयोगकर्ताहरू',
    'admin.users.workers': 'कामदारहरू',
    'admin.users.employers': 'नियोक्ताहरू',
    'admin.users.admins': 'प्रशासक प्रयोगकर्ताहरू',
    'admin.users.verification': 'प्रमाणीकरण',
    'admin.users.approval': 'अनुमोदन',
    'admin.users.resetPassword': 'पासवर्ड रिसेट गर्नुहोस्',
    'admin.analytics.title': 'विश्लेषण',
    'admin.analytics.platform': 'प्लेटफर्म विश्लेषण',
    'admin.analytics.users': 'प्रयोगकर्ता तथ्याङ्कहरू',
    'admin.analytics.jobs': 'काम तथ्याङ्कहरू',
    'admin.system.title': 'प्रणाली',
    'admin.system.settings': 'प्रणाली सेटिङहरू',
    'admin.system.logs': 'गतिविधि लगहरू',
    
    // Forms
    'form.required': 'आवश्यक',
    'form.optional': 'वैकल्पिक',
    'form.name': 'नाम',
    'form.email': 'इमेल',
    'form.phone': 'फोन',
    'form.address': 'ठेगाना',
    'form.description': 'विवरण',
    'form.title': 'शीर्षक',
    'form.skills': 'सीपहरू',
    'form.location': 'स्थान',
    'form.payRate': 'पारिश्रमिक दर',
    'form.duration': 'अवधि',
    'form.deadline': 'अन्तिम मिति',
    'form.requirements': 'आवश्यकताहरू',
    'form.upload': 'अपलोड गर्नुहोस्',
    'form.download': 'डाउनलोड गर्नुहोस्',
    'form.remove': 'हटाउनुहोस्',
    
    // Job related
    'job.title': 'काम शीर्षक',
    'job.description': 'काम विवरण',
    'job.location': 'स्थान',
    'job.payRate': 'पारिश्रमिक दर',
    'job.duration': 'अवधि',
    'job.deadline': 'आवेदन अन्तिम मिति',
    'job.requirements': 'आवश्यकताहरू',
    'job.skills': 'आवश्यक सीपहरू',
    'job.status.open': 'खुला',
    'job.status.closed': 'बन्द',
    'job.status.draft': 'ड्राफ्ट',
    'job.apply': 'अहिले आवेदन दिनुहोस्',
    'job.applied': 'आवेदन दिइएको',
    'job.viewDetails': 'विवरण हेर्नुहोस्',
    'job.contactEmployer': 'नियोक्तालाई सम्पर्क गर्नुहोस्',
    
    // Application related
    'application.status.pending': 'पेन्डिङ',
    'application.status.accepted': 'स्वीकृत',
    'application.status.rejected': 'अस्वीकृत',
    'application.coverLetter': 'कभर लेटर',
    'application.appliedDate': 'आवेदन मिति',
    'application.viewApplication': 'आवेदन हेर्नुहोस्',
    'application.approve': 'अनुमोदन गर्नुहोस्',
    'application.reject': 'अस्वीकार गर्नुहोस्',
    
    // Messages
    'messages.sendMessage': 'सन्देश पठाउनुहोस्',
    'messages.typeMessage': 'आफ्नो सन्देश टाइप गर्नुहोस्...',
    'messages.conversation': 'कुराकानी',
    'messages.startChat': 'कुराकानी सुरु गर्नुहोस्',
    'messages.noConversations': 'अहिलेसम्म कुनै कुराकानी छैन',
    
    // Wallet & Payments
    'wallet.balance': 'हालको बैलेन्स',
    'wallet.totalEarned': 'कुल आम्दानी',
    'wallet.totalSpent': 'कुल खर्च',
    'wallet.topUp': 'टप अप',
    'wallet.withdraw': 'निकाल्नुहोस्',
    'wallet.transactions': 'लेनदेन इतिहास',
    'wallet.payment.pending': 'पेन्डिङ',
    'wallet.payment.completed': 'पूरा भएको',
    'wallet.payment.failed': 'असफल',
    
    // Status badges
    'status.online': 'अनलाइन',
    'status.offline': 'अफलाइन',
    'status.busy': 'व्यस्त',
    'status.active': 'सक्रिय',
    'status.inactive': 'निष्क्रिय',
    'status.suspended': 'निलम्बित',
    'status.banned': 'प्रतिबन्धित',
    'status.verified': 'प्रमाणित',
    'status.unverified': 'अप्रमाणित',
    'status.approved': 'अनुमोदित',
    'status.rejected': 'अस्वीकृत',
    'status.pending': 'पेन्डिङ',
    
    // Notifications
    'notification.profileUpdated': 'प्रोफाइल सफलतापूर्वक अपडेट भयो',
    'notification.jobPosted': 'काम सफलतापूर्वक पोस्ट भयो',
    'notification.applicationSubmitted': 'आवेदन सफलतापूर्वक पेश भयो',
    'notification.messagesSent': 'सन्देश सफलतापूर्वक पठाइयो',
    'notification.paymentProcessed': 'भुक्तानी सफलतापूर्वक प्रक्रिया भयो',
    'notification.userVerified': 'प्रयोगकर्ता सफलतापूर्वक प्रमाणित भयो',
    'notification.passwordReset': 'पासवर्ड रिसेट इमेल पठाइयो',
    
    // Errors
    'error.generic': 'केहि गलत भयो',
    'error.network': 'नेटवर्क त्रुटि',
    'error.unauthorized': 'अनधिकृत पहुँच',
    'error.notFound': 'फेला परेन',
    'error.validation': 'प्रमाणीकरण त्रुटि',
    'error.uploadFailed': 'फाइल अपलोड असफल',
    'error.insufficientBalance': 'अपर्याप्त बैलेन्स',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('preferred-language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('preferred-language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};