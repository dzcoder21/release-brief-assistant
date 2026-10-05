import { FormProvider, useForm } from 'react-hook-form';
import { Save, Sparkles } from 'lucide-react';
import Card, { CardBody } from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Textarea } from '../ui/Inputs';
import SectionEditor from './SectionEditor';
import QAEvidenceEditor from './QAEvidenceEditor';
import { SECTION_KEYS } from '../../utils/constants';

const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

export default function ReleaseForm({ defaultValues, showName, submitting, onSubmit, disabled }) {
  const methods = useForm({ defaultValues });
  const { register, handleSubmit, formState: { errors } } = methods;

  return (
    <FormProvider {...methods}>
      <form className="space-y-5 pb-24" noValidate>
        <Card>
          <CardBody className="grid gap-4 sm:grid-cols-3">
            {showName && (
              <Field label="Release name" htmlFor="name" error={errors.name?.message} className="sm:col-span-3">
                <Input id="name" placeholder="Payment Platform" {...register('name', { required: 'Release name is required', minLength: { value: 2, message: 'Name is too short' } })} />
              </Field>
            )}
            <Field label="Version" htmlFor="version" error={errors.version?.message} hint="Semantic version, e.g. 1.2.0">
              <Input id="version" placeholder="1.0.0" disabled={disabled} {...register('version', { required: 'Version is required', pattern: { value: SEMVER, message: 'Use a semantic version like 1.2.0' } })} />
            </Field>
            <Field label="Release date" htmlFor="releaseDate">
              <Input id="releaseDate" type="date" disabled={disabled} {...register('releaseDate')} />
            </Field>
            {showName && (
              <Field label="Description (optional)" htmlFor="description" className="sm:col-span-3">
                <Textarea id="description" rows={2} {...register('description')} />
              </Field>
            )}
          </CardBody>
        </Card>

        {SECTION_KEYS.map((key) => <SectionEditor key={key} name={key} disabled={disabled} />)}
        <QAEvidenceEditor disabled={disabled} />

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:left-60">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            <p className="hidden text-xs text-muted sm:block">AI analysis never approves or deploys a release. A person finalizes the brief.</p>
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="secondary" icon={Save} loading={submitting === 'draft'} disabled={Boolean(submitting) || disabled} onClick={handleSubmit((v) => onSubmit(v, false))}>Save draft</Button>
              <Button type="button" icon={Sparkles} loading={submitting === 'analyze'} disabled={Boolean(submitting) || disabled} onClick={handleSubmit((v) => onSubmit(v, true))}>Save &amp; analyze</Button>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
