import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { ResourceForm, useAppNotification } from '@helex/ui';
import { complaintsApi, type Complaint } from '../api';
import { complaintSections } from './complaintUi';

/**
 * Registration form — ResourceForm in `create` mode with the same two sections
 * as the record page (Identity, Contested decision), so registering and reading
 * a complaint look alike (COMPLAINTS.01 § UI). The decision date may be set in
 * the future on purpose: that rule is the backend's (business test 1), and its
 * 400 — like every refusal — is shown verbatim.
 */
export const ComplaintCreate = () => {
  const navigate = useNavigate();
  const notify = useAppNotification();
  const [form] = Form.useForm<Complaint>();
  const [decisionTypes, setDecisionTypes] = useState<{ code: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    complaintsApi
      .decisionTypes()
      .then(setDecisionTypes)
      .catch((e) => notify.error('Could not load decision types', e.message));
  }, [notify]);

  const submit = async (values: Complaint) => {
    setSaving(true);
    try {
      const created = await complaintsApi.create({
        caseNumber: values.caseNumber,
        subject: values.subject,
        decisionTypeCode: values.decisionTypeCode,
        decisionDate: values.decisionDate,
        complainantIsikukood: values.complainantIsikukood,
        decisionReference: values.decisionReference || undefined,
      });
      notify.success('Registered', `${created.caseNumber} · ${created.subject}`);
      navigate('/complaints');
    } catch (e) {
      notify.error('Registration failed', (e as Error).message); // 400/409 problem detail, verbatim
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResourceForm<Complaint>
      mode="create"
      entityLabel="Complaint"
      createTitle="Register a complaint"
      icon={<FileTextOutlined />}
      form={form}
      initialValues={{}}
      sections={complaintSections({ decisionTypes, creating: true })}
      saving={saving}
      saveLabel="Register"
      onSave={submit}
      onCancel={() => navigate('/complaints')}
      onBack={() => navigate('/complaints')}
      backTooltip="Back to the list"
    />
  );
};
