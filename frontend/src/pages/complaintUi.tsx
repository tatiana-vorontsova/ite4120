import { DatePicker } from 'antd';
import type { TagProps } from 'antd';
import dayjs from 'dayjs';
import {
  AppAlert,
  AppBadge,
  AppCard,
  AppDate,
  AppSpace,
  AppTag,
  AppTypography,
  FieldItem,
  type ResourceFormSection,
} from '@helex/ui';
import type { Complaint, ComplainantLookup } from '../api';

/*
 * The pieces the three complaint screens share — one place, so the list, the
 * record page and the registration form cannot drift apart. Every colour here
 * is a semantic value of a library component (AppTag `color`, AppBadge
 * `status`, AppAlert `type`), resolved by the active theme: no hex codes.
 */

/**
 * One colour per decision type, from the theme's semantic palette: antd's
 * status colours (`processing` = brand, `success`, `warning`, `error`) are the
 * Tag colours the theme defines; its named presets (`blue`, `cyan`…) are
 * antd's generic palette, not the theme's, so they are not used.
 */
const DECISION_TYPE_COLOR: Record<string, TagProps['color']> = {
  PERMIT: 'processing',
  BENEFIT: 'success',
  TAX: 'warning',
  RISK_SCORE: 'error',
};

export const DecisionTypeTag = ({ code }: { code?: string }) =>
  code ? <AppTag color={DECISION_TYPE_COLOR[code] ?? 'default'}>{code}</AppTag> : null;

/**
 * A date input that accepts what the form store holds — the known pitfall from
 * AGENTS.md: ResourceForm's built-in `date` field crashes the picker, because
 * the store holds the API's `YYYY-MM-DD` string. String or dayjs in, string out.
 * `allowFuture` is for the registration form only: there the future-date rule
 * is left to the backend (business test 1), whose 400 the user then reads.
 */
const DateField = ({
  value,
  onChange,
  allowFuture,
}: {
  value?: unknown;
  onChange?: (next: string | null) => void;
  allowFuture?: boolean;
}) => (
  <DatePicker
    style={{ width: '100%' }}
    value={value ? dayjs(String(value)) : null}
    onChange={(d) => onChange?.(d ? d.format('YYYY-MM-DD') : null)}
    maxDate={allowFuture ? undefined : dayjs()}
  />
);

/**
 * The two sections of a complaint — Identity and Contested decision — used by
 * the record page (view / edit) and by the registration form (create), so both
 * read the same. On the page the case number is read-only (it never changes);
 * in the form it is the first thing typed.
 */
export const complaintSections = ({
  decisionTypes,
  creating,
}: {
  decisionTypes: { code: string; name: string }[];
  creating: boolean;
}): ResourceFormSection<Complaint>[] => [
  {
    key: 'identity',
    title: 'Identity',
    fields: [
      {
        name: 'caseNumber',
        label: 'Case number',
        type: 'text',
        required: creating,
        rules: creating ? [{ required: true, max: 50 }] : undefined,
        placeholder: 'CMP-2026-0042',
        modeOverride: creating ? undefined : 'view',
        tooltip: creating
          ? 'Unique among active complaints'
          : 'A case number never changes; withdraw and re-register to reuse it',
      },
      {
        name: 'subject',
        label: 'Subject',
        type: 'text',
        required: true,
        rules: [{ required: true, max: 255 }],
        placeholder: 'What is contested, in one line',
      },
      {
        name: 'decisionTypeCode',
        label: 'Decision type',
        type: 'select',
        required: true,
        rules: [{ required: true }],
        options: decisionTypes.map((t) => ({ value: t.code, label: t.name })),
        viewRender: (code) => <DecisionTypeTag code={code ? String(code) : undefined} />,
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
        tooltip: 'Date of the contested decision — must not be in the future',
        render: ({ value, onChange }) => <DateField value={value} onChange={onChange} allowFuture={creating} />,
        viewRender: (value) => (value ? <AppDate value={String(value)} /> : '—'),
      },
      {
        name: 'decisionReference',
        label: 'Decision reference',
        type: 'text',
        rules: [{ max: 50 }],
        tooltip: "The contested decision's own number, if known",
      },
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
        tooltip: 'Try 38102130265 — the mock population registry knows this person',
      },
    ],
  },
];

/** The registry outcome as a status badge — the same words on every screen (COMPLAINTS.01 § UI). */
const LOOKUP_STATUS = {
  found: { status: 'success', text: 'Found in the population registry' },
  unknown: { status: 'warning', text: 'Not found in the population registry' },
  unavailable: { status: 'default', text: 'Population registry unavailable' },
} as const;

/** One line for the list's detail panel: the name when found, otherwise the badge. */
export const ComplainantStatus = ({ lookup }: { lookup: ComplainantLookup | null }) => {
  if (!lookup) return <AppTypography.Text type="secondary">Asking the population registry…</AppTypography.Text>;
  if (lookup.kind === 'found') {
    const c = lookup.complainant;
    return (
      <span>
        <b>
          {c.firstName} {c.lastName}
        </b>
        , {c.address}
      </span>
    );
  }
  return <AppBadge status={LOOKUP_STATUS[lookup.kind].status} text={LOOKUP_STATUS[lookup.kind].text} />;
};

/**
 * The complainant as a card of its own on the record page. Fail open, readable:
 * whatever the registry answers, the card says so calmly and the rest of the
 * page does not depend on it.
 */
export const ComplainantCard = ({ code, lookup }: { code?: string; lookup: ComplainantLookup | null }) => (
  <AppCard title="Complainant" size="small">
    <AppSpace direction="vertical" size="small" style={{ width: '100%' }}>
      {lookup ? (
        <AppBadge status={LOOKUP_STATUS[lookup.kind].status} text={LOOKUP_STATUS[lookup.kind].text} />
      ) : (
        <AppTypography.Text type="secondary">Asking the population registry…</AppTypography.Text>
      )}
      <div>
        <FieldItem label="Personal code">{code ?? '—'}</FieldItem>
        {lookup?.kind === 'found' && (
          <>
            <FieldItem label="Name">
              {lookup.complainant.firstName} {lookup.complainant.lastName}
            </FieldItem>
            <FieldItem label="Address">{lookup.complainant.address}</FieldItem>
          </>
        )}
      </div>
      {lookup?.kind === 'unknown' && (
        <AppAlert
          type="warning"
          showIcon
          title="This personal code is not in the population registry"
          description="The complaint is registered as entered. Check the code with the complainant."
        />
      )}
      {lookup?.kind === 'unavailable' && (
        <AppAlert
          type="info"
          showIcon
          title="The population registry is not answering"
          description="The complaint is unaffected — it can be read, edited and withdrawn. The name and address appear here once the registry answers."
        />
      )}
      {lookup?.kind === 'found' && (
        <AppTypography.Text type="secondary">Looked up live — never stored in this register.</AppTypography.Text>
      )}
    </AppSpace>
  </AppCard>
);
