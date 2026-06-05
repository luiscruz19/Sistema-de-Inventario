import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SidebarLayout } from './sidebar-layout';

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
});

export const metadata: Metadata = {
    title: 'Inventario y Ventas - Panel de administracion',
    description: 'Sistema integral de gestion de inventario, ventas y compras',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" className={inter.variable}>
            <body className="font-sans">
                <SidebarLayout>{children}</SidebarLayout>
            </body>
        </html>
    );
}
