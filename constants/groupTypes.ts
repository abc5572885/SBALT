export type GroupType = 'casual' | 'competition_org' | 'team' | 'venue_operator';

export interface GroupTypeConfig {
  key: GroupType;
  label: string;
  description: string;
  officialOnly?: boolean;
}

export const GROUP_TYPES: GroupTypeConfig[] = [
  {
    key: 'casual',
    label: '揪打群',
    description: '朋友約打球，固定或臨時都可以',
  },
  {
    key: 'team',
    label: '球隊',
    description: '固定班底，定期練球、打友誼賽',
  },
  {
    key: 'competition_org',
    label: '比賽方',
    description: '賽事主辦單位，發布比賽資訊',
    officialOnly: true,
  },
  {
    key: 'venue_operator',
    label: '場地方',
    description: '運動場地、國民運動中心、民間場館',
    officialOnly: true,
  },
];

export function getGroupTypeLabel(type: string | null | undefined): string {
  return GROUP_TYPES.find((t) => t.key === type)?.label || '揪打群';
}
