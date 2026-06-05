import type { Metadata } from 'next';
import './globals.css';
import { SidebarLayout } from './sidebar-layout';

export const metadata: Metadata = {
    title: 'Inventario y Ventas - Panel de administracion',
    description: 'Sistema integral de gestion de inventario, ventas y compras',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <body>
                <SidebarLayout>{children}</SidebarLayout>
            </body>
        </html>
    );
}
