import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AdminEmail = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/admin', { state: { section: 'email' }, replace: true });
  }, [navigate]);

  return null;
};

export default AdminEmail;
