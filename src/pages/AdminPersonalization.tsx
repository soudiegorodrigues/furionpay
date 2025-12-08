import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AdminPersonalization = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/admin', { state: { section: 'personalizacao' }, replace: true });
  }, [navigate]);

  return null;
};

export default AdminPersonalization;
