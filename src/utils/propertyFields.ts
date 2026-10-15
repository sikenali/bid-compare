/**
 * 属性检查 - 13 个对比字段配置与构建工具
 * 统一维护"文件名称"到"文件字数"等字段名、默认值与状态判定,
 * 避免在 PropertyCheck.vue 的 handleCheck / viewHistoricalRecord 中硬编码重复。
 */

export type PropertyStatus = 'match' | 'mismatch' | 'warning';

export interface PropertyDetail {
  name: string;
  leftValue: string;
  rightValue: string;
  status: PropertyStatus;
}

export interface PropertyValueSource {
  /** 获取任意键对应的属性值,缺省返回 undefined */
  get(key: string): string | undefined;
}

export interface PropertyFieldDef {
  /** 显示名(中文) */
  name: string;
  /** 取值时优先查询的键,支持多个,按顺序取第一个非空的 */
  keys: string[];
  /** 兜底值(解析与历史回放均无值时使用) */
  fallback: string;
  /** 不匹配时是否使用 warning 状态(用于文件类型等差异容忍字段) */
  fallbackMismatchToWarning?: boolean;
}

/**
 * 13 项属性字段定义 - 单点维护
 * key 与 useFileParser 解析出的 properties 字段一致
 */
export const PROPERTY_FIELDS: PropertyFieldDef[] = [
  { name: '文件名称',     keys: ['文件名', '文件名称'],           fallback: '' },
  { name: '文件大小',     keys: ['文件大小'],                   fallback: '未知' },
  { name: '文件类型',     keys: ['文件类型'],                   fallback: '未知', fallbackMismatchToWarning: true },
  { name: '作者',         keys: ['作者'],                       fallback: '未知' },
  { name: '最后一次保存者', keys: ['最后一次保存者'],              fallback: '未知' },
  { name: '修订号',       keys: ['修订号'],                     fallback: '未知' },
  { name: '页码范围',     keys: ['页码范围'],                   fallback: '未知' },
  { name: '程序名称',     keys: ['程序名称'],                   fallback: '未知', fallbackMismatchToWarning: true },
  { name: '公司',         keys: ['公司'],                       fallback: '未知' },
  { name: '创建时间',     keys: ['创建时间'],                   fallback: '未知' },
  { name: '修改时间',     keys: ['修改时间'],                   fallback: '未知' },
  { name: '页数',         keys: ['页数', '页码范围'],             fallback: '未知' },
  { name: '文件字数',     keys: ['文本内容长度', '文件字数'],      fallback: '0' }
];

/**
 * 基于已解析的 properties 字典 + 文件信息构建取值源
 */
export function propsMapSource(
  properties: Record<string, string> | undefined,
  fallbackName: string,
  fallbackSize: string,
  fallbackType: string
): PropertyValueSource {
  return {
    get(key: string): string | undefined {
      const v = properties?.[key];
      if (v !== undefined && v !== '') return v;
      // 兜底映射
      if (key === '文件名' || key === '文件名称') return fallbackName;
      if (key === '文件大小') return fallbackSize;
      if (key === '文件类型') return fallbackType;
      return undefined;
    }
  };
}

/**
 * 基于历史记录对象构建取值源
 */
export function recordSource(record: {
  leftFileName: string;
  rightFileName: string;
  leftFileSize?: string;
  rightFileSize?: string;
  leftFileType?: string;
  rightFileType?: string;
}): PropertyValueSource {
  const map: Record<string, { left: string | undefined; right: string | undefined }> = {
    '文件名称': { left: record.leftFileName, right: record.rightFileName },
    '文件名':   { left: record.leftFileName, right: record.rightFileName },
    '文件大小': { left: record.leftFileSize, right: record.rightFileSize },
    '文件类型': { left: record.leftFileType, right: record.rightFileType }
  };
  return {
    get(key: string): string | undefined {
      return map[key]?.left !== undefined || map[key]?.right !== undefined
        ? (map[key].left ?? map[key].right)
        : undefined;
    }
  };
}

/**
 * 简单字典取值源
 */
export function simpleSource(map: Record<string, string | undefined>): PropertyValueSource {
  return {
    get(key: string): string | undefined {
      return map[key];
    }
  };
}

/**
 * 从给定的取值源中,按字段定义依次取值
 */
function pickValue(
  source: PropertyValueSource | undefined,
  field: PropertyFieldDef,
  fallbackOverride: string | null
): string {
  if (!source) return fallbackOverride ?? field.fallback;
  for (const key of field.keys) {
    const v = source.get(key);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return fallbackOverride ?? field.fallback;
}

/**
 * 比较两个取值源的字段值,产出 status
 */
function compareValues(
  left: string,
  right: string,
  field: PropertyFieldDef,
  fallbackOverride: string | null
): PropertyStatus {
  if (left === right) return 'match';
  // 都退化到兜底视为"无法判断"
  const fb = fallbackOverride ?? field.fallback;
  if (left === fb && right === fb) return 'warning';
  return field.fallbackMismatchToWarning ? 'warning' : 'mismatch';
}

/**
 * 基于两个取值源构建完整的 13 项属性详情数组
 * @param fallbackOverride 覆盖字段默认 fallback(如历史记录中常用 'N/A')
 */
export function buildPropertyDetails(
  left: PropertyValueSource | undefined,
  right: PropertyValueSource | undefined,
  fallbackOverride: string | null = null
): PropertyDetail[] {
  return PROPERTY_FIELDS.map(field => {
    const lv = pickValue(left, field, fallbackOverride);
    const rv = pickValue(right, field, fallbackOverride);
    return {
      name: field.name,
      leftValue: lv,
      rightValue: rv,
      status: compareValues(lv, rv, field, fallbackOverride)
    };
  });
}
