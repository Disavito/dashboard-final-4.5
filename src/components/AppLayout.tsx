import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import useRealtimeNotifications from '@/hooks/useRealtimeNotifications';
import { useUser } from '@/context/UserContext';
import NotificationBell from '@/components/ui/NotificationBell';
import { Toaster } from '@/components/ui/toaster';

const Header: React.FC = () => {
    const { user, loading } = useUser();

    return (
        <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/90 backdrop-blur-sm shadow-xl shadow-background/50">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center space-x-4">
                    <h1 className="text-2xl font-extrabold text-primary tracking-wider">
                        <Link to="/">BOLT DASHBOARD</Link>
                    </h1>
                </div>
                <nav className="flex items-center space-x-4">
                    {!loading && user && (
                        <>
                            <NotificationBell />
                            <span className="text-sm text-textSecondary hidden sm:inline truncate max-w-[150px]">
                                {user.email}
                            </span>
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-base shadow-md">
                                {user.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
};

const AppLayout: React.FC = () => {
    const { loading } = useUser();
    
    useRealtimeNotifications(); 

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-text">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-textSecondary">Autenticando sesión y permisos...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-text">
            <Header />
            <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <Outlet />
            </main>
            <Toaster />
        </div>
    );
};

export default AppLayout;
