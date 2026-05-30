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

interface ProjectMeta {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

export function ProjectWorkspaceHeader({ project }: { project: ProjectMeta }) {
  const { data: session } = useSession();
  const user = session?.user as any;

  return (
    <header data-project-workspace-header="true" className="h-14 border-b bg-background flex items-center justify-between px-5 sticky top-0 z-20 shrink-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{project.name}</p>
        {project.address && (
          <p className="text-xs text-muted-foreground truncate">{project.address}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-1.5 h-8 px-2">
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="text-sm font-medium hidden sm:block max-w-[100px] truncate">{user?.name ?? 'User'}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="font-medium truncate">{user?.name}</div>
              <div className="text-xs text-muted-foreground font-normal truncate">{user?.email}</div>
              <div className="text-xs text-muted-foreground font-normal capitalize mt-0.5">
                {user?.role?.toLowerCase().replace(/_/g, ' ')}
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
