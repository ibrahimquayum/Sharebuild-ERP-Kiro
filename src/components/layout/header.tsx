'use client';

import { Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header({ title }: { title?: string }) {
  const { data: session } = useSession();
  const user = session?.user as any;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-background px-6">
      <div className="leading-tight">
        {title && <h1 className="text-base font-semibold text-slate-900">{title}</h1>}
        {user?.companyName && (
          <p className="text-xs text-muted-foreground">{user.companyName}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-9 px-3">
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="text-sm font-medium hidden sm:block">{user?.name ?? 'User'}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="font-medium">{user?.name}</div>
              <div className="text-xs text-muted-foreground font-normal">{user?.email}</div>
              <div className="text-xs text-muted-foreground font-normal capitalize mt-0.5">
                {user?.role?.toLowerCase().replace('_', ' ')}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
