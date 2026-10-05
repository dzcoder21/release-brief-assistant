import { useFieldArray, useFormContext } from 'react-hook-form';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import { Field, Input, Textarea } from '../ui/Inputs';
import { SECTIONS } from '../../utils/constants';
import { emptyItem } from '../../utils/releaseForm';

export default function SectionEditor({ name, disabled }) {
  const config = SECTIONS[name];
  const { control, register, watch } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({ control, name });
  const none = watch(`none.${name}`);

  return (
    <Card>
      <CardHeader
        title={config.label}
        description={none ? 'Marked as “None”. Nothing will be listed for this section.' : `${fields.length} ${fields.length === 1 ? 'item' : 'items'}`}
        actions={
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input type="checkbox" className="h-4 w-4 rounded border-border accent-[rgb(var(--primary))]" disabled={disabled} {...register(`none.${name}`)} />
            None for this release
          </label>
        }
      />
      {!none && (
        <div className="space-y-3 p-4 sm:p-5">
          {fields.length === 0 && <p className="text-sm text-muted">Nothing added yet. Add an item, or tick “None” if this section genuinely does not apply.</p>}
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-border bg-bg/50 p-3 sm:p-4">
              <input type="hidden" {...register(`${name}.${index}.itemId`)} />
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-xs text-muted">{field.itemId || 'new item'}</span>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" disabled={disabled || index === 0} onClick={() => move(index, index - 1)} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button type="button" variant="ghost" size="sm" disabled={disabled || index === fields.length - 1} onClick={() => move(index, index + 1)} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></Button>
                  <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => remove(index)} aria-label="Delete item"><Trash2 className="h-3.5 w-3.5 text-danger" /></Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={config.titleLabel} className="sm:col-span-2">
                  <Input placeholder={config.titlePlaceholder} disabled={disabled} {...register(`${name}.${index}.title`)} />
                </Field>
                <Field label="Description" className="sm:col-span-2">
                  <Textarea disabled={disabled} {...register(`${name}.${index}.description`)} />
                </Field>
                {config.users && (
                  <Field label="Affected users" hint="Separate groups with commas">
                    <Input placeholder="Existing customers, Admins" disabled={disabled} {...register(`${name}.${index}.affectedUsersText`)} />
                  </Field>
                )}
                {config.reference && (
                  <Field label="Ticket / reference (optional)">
                    <Input placeholder="PAY-123" disabled={disabled} {...register(`${name}.${index}.reference`)} />
                  </Field>
                )}
              </div>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" icon={Plus} disabled={disabled} onClick={() => append(emptyItem())}>{config.addLabel}</Button>
        </div>
      )}
    </Card>
  );
}
