import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import ReleaseForm from '../components/releases/ReleaseForm';
import Card from '../components/ui/Card';
import { SkeletonCards } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/States';
import { useFetch } from '../hooks/useFetch';
import { releaseService, versionService } from '../services/releaseService';
import { errorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import { toFormValues, toPayload } from '../utils/releaseForm';
import { nextPatch } from '../utils/format';

/** One editor for three modes: new release, new version of a release, edit a draft version. */
export default function ReleaseEditor({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(null);

  const { data, loading, error, reload } = useFetch(async () => {
    if (mode === 'new') return { defaults: toFormValues() };
    if (mode === 'edit') {
      const d = await versionService.get(id);
      return { defaults: toFormValues({ name: d.release.name, version: d.version, qaEvidence: d.qaEvidence }), release: d.release, version: d.version, locked: !d.editable };
    }
    const { release, versions } = await releaseService.get(id);
    const latest = versions[0] && (await versionService.get(versions[0]._id));
    const defaults = toFormValues({ name: release.name, version: latest?.version, qaEvidence: latest?.qaEvidence });
    defaults.version = nextPatch(latest?.version?.version);
    defaults.releaseDate = '';
    return { defaults, release, basedOn: latest?.version?.version };
  }, [mode, id]);

  const submit = async (values, analyze) => {
    setSubmitting(analyze ? 'analyze' : 'draft');
    try {
      const payload = toPayload(values, { includeName: mode === 'new' });
      let result;
      if (mode === 'new') result = await releaseService.create(payload);
      else if (mode === 'version') result = await versionService.create(id, payload);
      else result = await versionService.update(id, payload);
      const version = result.version;
      const versionId = version._id;
      const releaseId = mode === 'new' ? result.release._id : version.releaseId;

      if (analyze) {
        try {
          await versionService.analyze(versionId);
          toast.success('Saved. Analysis started.');
        } catch (err) {
          toast.error(`Saved, but analysis could not start: ${errorMessage(err)}`);
        }
        navigate(`/versions/${versionId}/analysis`);
      } else {
        toast.success('Draft saved.');
        navigate(`/releases/${releaseId}`);
      }
    } catch (err) {
      toast.error(errorMessage(err));
      setSubmitting(null);
    }
  };

  const title = { new: 'New release', version: `New version of ${data?.release?.name || 'release'}`, edit: `Edit draft v${data?.version?.version || ''}` }[mode];
  const subtitle = {
    new: 'Describe what is shipping. Add one item per feature, fix or note so evidence can be cited precisely.',
    version: data?.basedOn ? `Pre-filled from v${data.basedOn}. Earlier versions are never changed; statements reviewed there are re-checked against this package.` : '',
    edit: 'Drafts can be edited until the first analysis completes. After that, create a new version.',
  }[mode];

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} crumbs={[{ label: 'Releases', to: '/releases' }, { label: title }]} />
      {loading ? <SkeletonCards count={3} className="h-40" /> : error ? <Card><ErrorState message={error} onRetry={reload} /></Card> : data.locked ? (
        <Card className="p-6 text-sm">This version is locked because analysis has completed. Create a new version to change the release package.</Card>
      ) : (
        <ReleaseForm defaultValues={data.defaults} showName={mode === 'new'} submitting={submitting} onSubmit={submit} />
      )}
    </>
  );
}
