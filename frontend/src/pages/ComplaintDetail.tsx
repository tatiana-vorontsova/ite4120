import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useDataController } from '@helex/core';
import { AppCard, AppSpace, AppTimestamp, FieldItem, ResourceForm, useAppNotification } from '@helex/ui';
import { complaintsApi, type Complaint, type ComplainantLookup } from '../api';
import { ComplainantCard, DecisionTypeTag, complaintSections } from './complaintUi';

/**
 * One complaint on @helex/ui's ResourceForm with useDataController, in the shape
 * of AnimalDetail (COMPLAINTS.01 § UI). The record reads in two blocks —
 * Identity and Contested decision — and the sidebar carries what matters beside
 * them as cards: the complainant, looked up live from the population registry,
 * and the platform metadata. Edit → Save is PUT (the case number stays read-only);
 * Withdraw is the soft DELETE. The complainant card never holds the page up —
 * fail open, visible.
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

  return (
    <ResourceForm<Complaint>
      mode={mode}
      entityLabel="Complaint"
      icon={<FileTextOutlined />}
      name={dc.current.caseNumber}
      subtitle={dc.current.subject}
      chips={<DecisionTypeTag code={dc.current.decisionTypeCode} />}
      loading={loading}
      saving={saving}
      deleting={deleting}
      form={form}
      dataController={dc}
      initialValues={dc.current}
      sections={complaintSections({ decisionTypes, creating: false })}
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
        <AppSpace direction="vertical" size="middle" style={{ width: '100%' }}>
          <ComplainantCard code={dc.current.complainantIsikukood} lookup={lookup} />
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
        </AppSpace>
      }
    />
  );
};
