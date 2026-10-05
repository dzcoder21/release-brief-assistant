import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Inputs';
import { QA_STATUS } from '../../utils/constants';
import { emptyEvidence } from '../../utils/releaseForm';

export default function QAEvidenceEditor({ disabled }) {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: 'qaEvidence' });

  return (
    <Card>
      <CardHeader title="QA Evidence" description="Individual test results. The AI may only cite what is listed here; a test you leave out is treated as not executed." />
      <div className="space-y-3 p-4 sm:p-5">
        {fields.length === 0 && <p className="text-sm text-muted">No evidence added. Claims about testing will be reported as unsupported.</p>}
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-lg border border-border bg-bg/50 p-3 sm:p-4">
            <input type="hidden" {...register(`qaEvidence.${index}.evidenceId`)} />
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-xs text-muted">{field.evidenceId || 'new evidence'}</span>
              <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => remove(index)} aria-label="Delete evidence"><Trash2 className="h-3.5 w-3.5 text-danger" /></Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Test / check" className="sm:col-span-2"><Input placeholder="Payment retry test" disabled={disabled} {...register(`qaEvidence.${index}.title`)} /></Field>
              <Field label="Result">
                <Select disabled={disabled} {...register(`qaEvidence.${index}.status`)}>
                  {Object.entries(QA_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
              </Field>
              <Field label="Details" className="sm:col-span-3"><Textarea rows={2} disabled={disabled} {...register(`qaEvidence.${index}.description`)} /></Field>
              <Field label="Source (optional)" className="sm:col-span-3"><Input placeholder="CI run #5120, QA sheet…" disabled={disabled} {...register(`qaEvidence.${index}.source`)} /></Field>
            </div>
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" icon={Plus} disabled={disabled} onClick={() => append(emptyEvidence())}>Add QA evidence</Button>
      </div>
    </Card>
  );
}
