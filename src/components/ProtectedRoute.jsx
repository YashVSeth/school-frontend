import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Agar teacher admin page kholne ki koshish kare toh
    return <Navigate to={role === 'teacher' ? '/teacher/dashboard' : '/admin/dashboard'} replace />;
  }

  return children;
};

export default ProtectedRoute;