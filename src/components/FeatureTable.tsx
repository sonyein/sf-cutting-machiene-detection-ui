import { memo, useMemo } from 'react'
import type { Reading } from '../domain/types'
import type { SensorConfig } from '../services/sensorRepository'
import { extractSignalFeatures } from '../domain/signal'

export const FeatureTable = memo(function FeatureTable({ config, readings }: { config: SensorConfig; readings: Reading[] }) {
  const features = useMemo(() => extractSignalFeatures(readings), [readings])
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>특징값</th><th className="numeric">현재 구간</th><th>예시 비교 기준</th><th>비교</th></tr></thead><tbody>{config.rules.map((rule) => {
    const value = features?.[rule.key]
    const missing = value === undefined || value === null
    const bounded = rule.min !== undefined || rule.max !== undefined
    const outside = !missing && ((rule.min !== undefined && value < rule.min) || (rule.max !== undefined && value > rule.max))
    return <tr key={rule.key}><td>{rule.label}</td><td className="numeric"><strong>{missing ? '—' : value.toFixed(rule.key === 'risingEdges' ? 0 : 2)}</strong> <span className="unit">{rule.unit}</span></td><td>{rule.reference}</td><td><span className={outside ? 'comparison-outside' : 'comparison-within'}>{missing ? '계산 불가' : !bounded ? '참고 값' : outside ? '기준 밖' : '기준 이내'}</span></td></tr>
  })}</tbody></table></div>
})
