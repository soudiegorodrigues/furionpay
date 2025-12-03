import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogAction
} from '@/components/ui/alert-dialog';
import { Ban } from 'lucide-react';

interface BlockedUserAlertProps {
  isBlocked: boolean;
}

const BlockedUserAlert = ({ isBlocked }: BlockedUserAlertProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isBlocked) {
      setOpen(true);
    }
  }, [isBlocked]);

  const handleClose = () => {
    setOpen(false);
    navigate('/admin');
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Ban className="h-8 w-8 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Usuário Bloqueado
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Sua conta foi bloqueada pelo administrador. Você será desconectado automaticamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction onClick={handleClose}>
            Entendi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BlockedUserAlert;