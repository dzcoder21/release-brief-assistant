import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-1 text-xl font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-muted">The page you are looking for does not exist or was moved.</p>
      <Link to="/" className="mt-4"><Button>Back to dashboard</Button></Link>
    </div>
  );
}
