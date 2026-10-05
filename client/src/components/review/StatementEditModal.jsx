import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Textarea } from '../ui/Inputs';

export default function StatementEditModal({ statement, initialNote, saving, onClose, onSave }) {
  const [content, setContent] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (statement) {
      setContent(statement.editedContent || statement.content);
      setNote(initialNote ?? statement.reviewerNote ?? '');
    }
  }, [statement, initialNote]);

  const empty = !content.trim();
  return (
    <Modal
      open={Boolean(statement)}
      onClose={onClose}
      title="Edit statement"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button loading={saving} disabled={empty} onClick={() => onSave(content.trim(), note.trim())}>Save edit</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Statement" error={empty ? 'A statement cannot be empty' : undefined} hint="Saving a changed statement marks it as human-edited. You are responsible for its accuracy.">
          <Textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
        </Field>
        <Field label="Reviewer note (optional)">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
