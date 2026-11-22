import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Select, DatePicker } from 'antd';
import { AppButtonPrimary, AppButtonSecondary, AppCard, useAppNotification } from '@helex/ui';
import type { Dayjs } from 'dayjs';
import { complaintsApi } from '../api';

/**
 * Registration form, field by field as COMPLAINTS.01 § UI specifies — every
 * input a library component. The date picker deliberately does not block
 * future dates: that rule belongs to the backend (business test 1), and its
 * 400 is shown verbatim, like every other refusal.
 */
export const ComplaintCreate = () => {
  const navigate = useNavigate();
  const notify = useAppNotification();
  const [decisionTypes, setDecisionTypes] = useState<{ code: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    complaintsApi
      .decisionTypes()
      .then(setDecisionTypes)
      .catch((e) => notify.error('Could not load decision types', e.message));
  }, [notify]);

  const submit = (values: {
    caseNumber: string;
    subject: string;
    decisionTypeCode: string;
    decisionDate: Dayjs;
    complainantIsikukood: string;
    decisionReference?: string;
  }) => {
    setSaving(true);
    complaintsApi
      .create({
        caseNumber: values.caseNumber,
        subject: values.subject,
        decisionTypeCode: values.decisionTypeCode,
        decisionDate: values.decisionDate.format('YYYY-MM-DD'),
        complainantIsikukood: values.complainantIsikukood,
        decisionReference: values.decisionReference || undefined,
      })
      .then((created) => {
        notify.success('Registered', `${created.caseNumber} · ${created.subject}`);
        navigate('/complaints');
      })
      .catch((e) => notify.error('Registration failed', e.message)) // 400/409 problem detail, verbatim
      .finally(() => setSaving(false));
  };

  return (
    <AppCard title="Register a complaint" style={{ maxWidth: 640, margin: '24px auto' }}>
      <Form layout="vertical" onFinish={submit} requiredMark>
        <Form.Item
          name="caseNumber"
          label="Case number"
          rules={[{ required: true, max: 50 }]}
          extra="Unique among active complaints — e.g. CMP-2026-0042"
        >
          <Input placeholder="CMP-2026-0042" />
        </Form.Item>
        <Form.Item name="subject" label="Subject" rules={[{ required: true, max: 255 }]}>
          <Input placeholder="What is contested, in one line" />
        </Form.Item>
        <Form.Item name="decisionTypeCode" label="Decision type" rules={[{ required: true }]}>
          <Select
            options={decisionTypes.map((t) => ({ value: t.code, label: t.name }))}
            placeholder="Choose a decision type"
          />
        </Form.Item>
        <Form.Item
          name="decisionDate"
          label="Decision date"
          rules={[{ required: true }]}
          extra="Date of the contested decision — must not be in the future"
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="complainantIsikukood"
          label="Complainant personal code"
          rules={[
            { required: true },
            { pattern: /^\d{11}$/, message: 'Exactly 11 digits' },
          ]}
          extra="Try 38102130265 — the mock registry knows this person"
        >
          <Input placeholder="38102130265" />
        </Form.Item>
        <Form.Item
          name="decisionReference"
          label="Decision reference"
          rules={[{ max: 50 }]}
          extra="The contested decision's own number, if known"
        >
          <Input />
        </Form.Item>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <AppButtonSecondary onClick={() => navigate('/complaints')}>Cancel</AppButtonSecondary>
          <AppButtonPrimary htmlType="submit" loading={saving}>
            Register
          </AppButtonPrimary>
        </div>
      </Form>
    </AppCard>
  );
};
