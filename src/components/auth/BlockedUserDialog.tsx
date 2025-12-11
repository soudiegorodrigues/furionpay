import { Ban } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface BlockedUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BlockedUserDialog({ open, onOpenChange }: BlockedUserDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl bg-black/90 border-white/10 backdrop-blur-xl">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center">
            <Ban className="h-8 w-8 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center text-xl font-semibold text-white">
            Usuário Bloqueado
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-white/50">
            Sua conta foi bloqueada pelo administrador. Entre em contato com o suporte para mais informações.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction 
            onClick={() => onOpenChange(false)} 
            className="rounded-xl bg-primary hover:bg-primary/90"
          >
            Entendi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
