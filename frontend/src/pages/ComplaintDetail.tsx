import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DatePicker, Form } from 'antd';
import dayjs from 'dayjs';
import { FileTextOutlined } from '@ant-design/icons';
import { useDataController } from '@helex/core';
import {
  AppCard,
  AppDate,
  AppTag,
  AppTimestamp,
  FieldItem,
  ResourceForm,
  useAppNotification,
  type ResourceFormSection,
} from '@helex/ui';
import { complaintsApi, type Complaint, type ComplainantLookup } from '../api';
import { ComplainantLine } from './ComplainantLine';

/**
 * A date input that accepts what the form store holds — the same wrapper as in
 * AnimalDetail, for the same known pitfall (AGENTS.md): ResourceForm's built-in
 * `date` field crashes the picker, because the store holds the API's
 * `YYYY-MM-DD` string. String or dayjs in, `YYYY-MM-DD` string out.
 */
const DateField = ({ value, onChange }: { value?: unknown; onChange?: (next: string | null) => void }) => (
  <DatePicker
    style={{ width: '100%' }}
    value={value ? dayjs(String(value)) : null}
    onChange={(d) => onChange?.(d ? d.format('YYYY-MM-DD') : null)}
    maxDate={dayjs()}
  />
);

/**
 * One complaint on @helex/ui's ResourceForm with useDataController, in the shape
 * of AnimalDetail (COMPLAINTS.01 § UI): sections Identity and Contested decision;
 * Edit → Save is PUT (the case number stays read-only — it never changes);
 * Withdraw is the soft DELETE; the sidebar is the platform metadata card. The
 * complainant's name comes from the population registry and is never needed
 * for anything else on the page — fail open.
 */
export const ComplaintDetail = () => {
  const { id } = useParams();
  const complaintId = Number(id);
  const navigate = useNavigate();
  const notify = useAppNotification();
  const [form] = Form.useForm<Complaint>();
  const dc = useDataController<Complaint>({} as Complaint);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [decisionTypes, setDecisionTypes] = useState<{ code: string; name: string }[]>([]);
  const [lookup, setLookup] = useState<ComplainantLookup | null>(null);

  const refreshComplainant = () => {
    setLookup(null);
    complaintsApi.complainant(complaintId).then(setLookup);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([complaintsApi.get(complaintId), complaintsApi.decisionTypes()])
      .then(([complaint, types]) => {
        if (cancelled) return;
        dc.load(complaint);
        form.setFieldsValue(complaint);
        setDecisionTypes(types);
        complaintsApi.complainant(complaintId).then((l) => !cancelled && setLookup(l));
      })
      .catch((e) => {
        notify.error('Could not load the complaint', e.message);
        navigate('/complaints');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // dc, form and navigate are stable handles; the record is keyed by the route parameter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaintId, notify]);

  const save = async (values: Complaint) => {
    setSaving(true);
    try {
      const updated = await complaintsApi.update(complaintId, { ...values, caseNumber: dc.current.caseNumber });
      dc.load(updated);
      form.setFieldsValue(updated);
      setMode('view');
      refreshComplainant(); // the personal code may have changed
      notify.success('Saved', `${updated.caseNumber} · ${updated.subject}`);
    } catch (e) {
      notify.error('Save failed', (e as Error).message); // 400 problem detail, verbatim
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async () => {
    setDeleting(true);
    try {
      await complaintsApi.withdraw(complaintId);
      notify.success('Withdrawn', `${dc.current.caseNumber} · ${dc.current.subject}`);
      navigate('/complaints');
    } catch (e) {
      notify.error('Withdraw failed', (e as Error).message);
      setDeleting(false);
    }
  };

  const sections: ResourceFormSection<Complaint>[] = [
    {
      key: 'identity',
      title: 'Identity',
      fields: [
        {
          name: 'caseNumber',
          label: 'Case number',
          type: 'text',
          modeOverride: 'view', // never changes — the API refuses a different one with 400
          tooltip: 'A case number never changes; withdraw and re-register to reuse it',
        },
        { name: 'subject', label: 'Subject', type: 'text', required: true, rules: [{ required: true, max: 255 }] },
        {
          name: 'decisionTypeCode',
          label: 'Decision type',
          type: 'select',
          required: true,
          options: decisionTypes.map((t) => ({ value: t.code, label: t.name })),
          viewRender: (code) => <AppTag>{String(code ?? '')}</AppTag>,
        },
      ],
    },
    {
      key: 'decision',
      title: 'Contested decision',
      fields: [
        {
          name: 'decisionDate',
          label: 'Decision date',
          type: 'custom',
          required: true,
          rules: [{ required: true }],
          tooltip: 'Must not be in the future',
          render: ({ value, onChange }) => <DateField value={value} onChange={onChange} />,
          viewRender: (value) => (value ? <AppDate value={String(value)} /> : '—'),
        },
        { name: 'decisionReference', label: 'Decision reference', type: 'text', rules: [{ max: 50 }] },
        {
          name: 'complainantIsikukood',
          label: 'Complainant personal code',
          type: 'text',
          required: true,
          rules: [
            { required: true },
            { pattern: /^\d{11}$/, message: 'Exactly 11 digits' },
          ],
          placeholder: '38102130265',
          // View mode adds what the registry says about that code — never stored.
          viewRender: (code) => (code ? <ComplainantLine code={String(code)} lookup={lookup} /> : '—'),
        },
      ],
    },
  ];

  return (
    <ResourceForm<Complaint>
      mode={mode}
      entityLabel="Complaint"
      icon={<FileTextOutlined />}
      name={dc.current.caseNumber}
      subtitle={dc.current.subject}
      chips={dc.current.decisionTypeCode ? <AppTag>{dc.current.decisionTypeCode}</AppTag> : undefined}
      loading={loading}
      saving={saving}
      deleting={deleting}
      form={form}
      dataController={dc}
      initialValues={dc.current}
      sections={sections}
      onBack={() => navigate('/complaints')}
      backTooltip="Back to the list"
      onEdit={() => setMode('edit')}
      onCancel={() => {
        dc.reset();
        form.setFieldsValue(dc.original ?? dc.current);
        setMode('view');
      }}
      onSave={save}
      onDelete={withdraw}
      deleteLabel="Withdraw"
      deleteConfirmText="Withdraw this complaint? A soft delete — the case number becomes reusable."
      sidebar={
        <AppCard title="Metadata" size="small">
          <FieldItem label="Created at">
            <AppTimestamp value={dc.current.sysCreatedAt} fallback="—" />
          </FieldItem>
          <FieldItem label="Created by">{dc.current.sysCreatedBy ?? '—'}</FieldItem>
          <FieldItem label="Modified at">
            <AppTimestamp value={dc.current.sysModifiedAt} fallback="—" />
          </FieldItem>
          <FieldItem label="Modified by">{dc.current.sysModifiedBy ?? '—'}</FieldItem>
          <FieldItem label="Version">{dc.current.sysVersion ?? '—'}</FieldItem>
        </AppCard>
      }
    />
  );
};
