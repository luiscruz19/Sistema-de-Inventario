'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (data.status > 0) {
                const token = data.user?.token || data.token || '';
                if (!token) {
                    setError('Respuesta inválida del servidor');
                    return;
                }
                localStorage.setItem('inventario_token', token);
                router.push('/');
            } else {
                setError(data.message || 'Credenciales incorrectas');
            }
        } catch {
            setError('Error de conexión. Intentá de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Panel izquierdo oscuro — desktop */}
            <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 bg-slate-900 flex-col items-center justify-center p-12">
                <img
                    src="/images/logo-light-removebg-preview.png"
                    alt="SDA.dev"
                    className="h-14 mb-10 object-contain"
                />
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-3">Inventario y Ventas</h1>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Controlá tu stock, ventas, compras<br />y facturación en tiempo real.
                    </p>
                </div>
                <div className="mt-auto pt-16 text-center">
                    <p className="text-xs text-muted-foreground">© SDA.dev · Todos los derechos reservados</p>
                </div>
            </div>

            {/* Panel derecho — formulario */}
            <div className="flex-1 flex flex-col bg-white">
                <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
                    {/* Logo mobile */}
                    <div className="lg:hidden mb-8 text-center">
                        <img
                            src="/images/logo.png"
                            alt="SDA.dev"
                            className="h-10 mx-auto object-contain mb-3"
                        />
                        <p className="text-sm font-medium text-muted-foreground">Inventario y Ventas</p>
                    </div>

                    <div className="w-full max-w-sm">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-foreground">Iniciar sesión</h2>
                            <p className="text-muted-foreground text-sm mt-1">Accedé a tu panel de gestión</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 text-sm bg-slate-50 transition-all"
                                        placeholder="tu@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-12 py-2.5 border border-slate-200 rounded-lg focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 text-sm bg-slate-50 transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Iniciando sesión...
                                    </span>
                                ) : 'Iniciar sesión'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="px-8 pb-6 text-center lg:hidden">
                    <p className="text-xs text-muted-foreground">
                        Desarrollado por <span className="font-medium text-muted-foreground">SDA.dev</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
