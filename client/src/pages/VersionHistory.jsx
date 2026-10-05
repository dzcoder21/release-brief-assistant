import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GitCompare, Plus } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { SkeletonRows } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/States';
import VersionsTable from '../components/releases/VersionsTable';
import { useFetch } from '../hooks/useFetch';
import { releaseService } from '../services/releaseService';

export default function VersionHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const { data, loading, error, reload } = useFetch(() => releaseService.get(id), [id]);

  const toggle = (vid) => setSelected((s) => (s.includes(vid) ? s.filter((x) => x !== vid) : s.length >= 2 ? [s[1], vid] : [...s, vid]));
  const compare = () => {
    const versions = data.versions;
    // oldest first so "left" is the earlier version
    const [left, right] = [...selected].sort((a, b) => versions.findIndex((v) => v._id === b) - versions.findIndex((v) => v._id === a));
    navigate(`/releases/${id}/compare?left=${left}&right=${right}`);
  };

  return (
    <>
      <PageHeader
        title="Version history"
        subtitle="Every version is an immutable snapshot. Select two to compare."
        crumbs={[{ label: 'Releases', to: '/releases' }, { label: data?.release.name || '…', to: `/releases/${id}` }, { label: 'Versions' }]}
        actions={
          <>
            <Button icon={GitCompare} disabled={selected.length !== 2} onClick={compare}>Compare selected</Button>
            <Link to={`/releases/${id}/versions/new`}><Button variant="secondary" icon={Plus}>New version</Button></Link>
          </>
        }
      />
      <Card>
        {loading ? <SkeletonRows /> : error ? <ErrorState message={error} onRetry={reload} /> : <VersionsTable versions={data.versions} selectable selected={selected} onToggle={toggle} />}
      </Card>
    </>
  );
}
