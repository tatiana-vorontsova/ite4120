import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  AppButtonPrimary,
  AppLink,
  AppTypography,
  ResourceList,
  useAppNotification,
  type ResourceListColumn,
} from '@helex/ui';
import { complaintsApi, type Complaint, type ComplainantLookup } from '../api';
import { ComplainantStatus, DecisionTypeTag } from './complaintUi';

/**
 * The complaints list (COMPLAINTS.01 § UI) on @helex/ui's ResourceList, in the
 * shape of AnimalList: columns, search, the decision-type filter, the register
 * button, and a detail panel with the complainant from the population registry.
 */
export const ComplaintList = () => {
  const navigate = useNavigate();
  const notify = useAppNotification();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [lookup, setLookup] = useState<ComplainantLookup | null>(null);
  /* Filter card state, as in AnimalList: `typeFilter` is what the Select shows,
     `appliedType` is what the list is filtered by — they meet on Apply. */
  const [decisionTypes, setDecisionTypes] = useState<{ code: string; name: string }[]>([]);
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [appliedType, setAppliedType] = useState<string | undefined>();

  useEffect(() => {
    complaintsApi.decisionTypes().then(setDecisionTypes).catch(() => setDecisionTypes([]));
  }, []);

  const load = useCallback((text: string, decisionTypeCode?: string) => {
    setLoading(true);
    complaintsApi
      .list(text || undefined, decisionTypeCode)
      .then((result) => {
        setComplaints(result.data);
        setTotal(result.meta?.total ?? result.data.length);
      })
      .catch((e) => notify.error('Could not load complaints', e.message))
      .finally(() => setLoading(false));
  }, [notify]);

  useEffect(() => {
    const t = setTimeout(() => load(search, appliedType), 250);
    return () => clearTimeout(t);
  }, [search, appliedType, load]);

  useEffect(() => {
    setLookup(null);
    if (!selected?.id) return undefined;
    let cancelled = false;
    complaintsApi.complainant(selected.id).then((l) => !cancelled && setLookup(l));
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const columns: ResourceListColumn<Complaint>[] = [
    {
      key: 'caseNumber',
      title: 'Case number',
      dataIndex: 'caseNumber',
      locked: true,
      // The identifier is the way into the record: it links to the complaint's page.
      render: (caseNumber: string, complaint: Complaint) => (
        <AppLink
          href={`/complaints/${complaint.id}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate(`/complaints/${complaint.id}`);
          }}
        >
          {caseNumber}
        </AppLink>
      ),
    },
    { key: 'subject', title: 'Subject', dataIndex: 'subject' },
    {
      key: 'decisionTypeCode',
      title: 'Decision type',
      dataIndex: 'decisionTypeCode',
      render: (code: string) => <DecisionTypeTag code={code} />,
    },
    { key: 'decisionDate', title: 'Decision date', dataIndex: 'decisionDate' },
    {
      key: 'decisionReference',
      title: 'Decision reference',
      dataIndex: 'decisionReference',
      defaultVisible: false,
    },
  ];

  return (
    <ResourceList<Complaint>
      title={
        <div>
          <div>Complaints</div>
          {/* The count leads, so a narrow header (detail panel open) trims the description, not the number. */}
          <AppTypography.Text type="secondary" style={{ fontWeight: 'normal' }}>
            {total !== null && `${total} active${search || appliedType ? ' matching' : ''} · `}
            Complaints against automated decisions — each recorded once, under its own case number
          </AppTypography.Text>
        </div>
      }
      columns={columns}
      dataSource={complaints}
      rowKey="id"
      loading={loading}
      search={{ value: search, onChange: setSearch, placeholder: 'Subject or case number…' }}
      filter={{
        content: (
          <Select
            style={{ minWidth: 220 }}
            placeholder="Decision type"
            allowClear
            value={typeFilter}
            onChange={setTypeFilter}
            options={decisionTypes.map((t) => ({ value: t.code, label: t.name }))}
          />
        ),
        onApply: () => setAppliedType(typeFilter),
        onClear: () => {
          setTypeFilter(undefined);
          setAppliedType(undefined);
        },
      }}
      actions={
        <AppButtonPrimary icon={<PlusOutlined />} onClick={() => navigate('/complaints/new')}>
          Register complaint
        </AppButtonPrimary>
      }
      detailView={{
        selectedRecord: selected,
        onSelectedRecordChange: setSelected,
        title: 'Complaint',
        render: (complaint) => (
          <div style={{ display: 'grid', gap: 8 }}>
            <div>
              <b>{complaint.caseNumber}</b> · {complaint.subject}
            </div>
            <div>
              <DecisionTypeTag code={complaint.decisionTypeCode} /> of {complaint.decisionDate}
              {complaint.decisionReference && ` · ${complaint.decisionReference}`}
            </div>
            <div>
              <AppTypography.Text type="secondary">Complainant {complaint.complainantIsikukood}</AppTypography.Text>
              <div>
                <ComplainantStatus lookup={lookup} />
              </div>
            </div>
          </div>
        ),
      }}
    />
  );
};
