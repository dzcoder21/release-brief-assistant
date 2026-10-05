import { Link } from 'react-router-dom';
import { FileText, GitCompare, Pencil, Sparkles, ClipboardCheck } from 'lucide-react';
import Button from '../ui/Button';

/** Next sensible actions for a version, based on where it is in the workflow. */
export default function VersionActions({ version, releaseId }) {
  const id = version._id;
  const analyzed = Boolean(version.aiAnalysis) || ['NEEDS_REVIEW', 'IN_REVIEW', 'REVIEWED', 'FINALIZED'].includes(version.status);
  return (
    <>
      {version.status === 'DRAFT' && <Link to={`/versions/${id}/edit`}><Button variant="secondary" icon={Pencil}>Edit draft</Button></Link>}
      <Link to={`/versions/${id}/analysis`}><Button variant={analyzed ? 'secondary' : 'primary'} icon={Sparkles}>{analyzed ? 'AI analysis' : 'Run analysis'}</Button></Link>
      {analyzed && <Link to={`/versions/${id}/review`}><Button icon={ClipboardCheck}>Review</Button></Link>}
      <Link to={`/versions/${id}/brief`}><Button variant="secondary" icon={FileText}>Brief</Button></Link>
      <Link to={`/releases/${releaseId}/compare?right=${id}`}><Button variant="ghost" icon={GitCompare}>Compare</Button></Link>
    </>
  );
}
