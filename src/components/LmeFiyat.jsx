import { useLmeFiyat, formatFiyat, formatSaat } from '../utils/lme'

export default function LmeFiyat() {
  const { data, loading, error, refresh } = useLmeFiyat()

  if (loading && !data) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gray-100 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
              <div className="h-2 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-6 w-20 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <div>
              <p className="text-xs font-medium text-gray-600">LME Alüminyum</p>
              <p className="text-[10px] text-gray-400">Veri alınamadı</p>
            </div>
          </div>
          <button
            onClick={refresh}
            className="text-xs px-2 py-1 rounded-md text-gray-500 border border-gray-200"
          >
            Yenile
          </button>
        </div>
      </div>
    )
  }

  const dusus = data.change != null && data.change < 0
  const artis = data.change != null && data.change > 0
  const yesil = '#3B6D11'
  const kirmizi = '#CC2B1D'
  const degisimRenk = dusus ? kirmizi : artis ? yesil : '#6B7280'
  const okIkon = dusus ? '▼' : artis ? '▲' : '—'

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        {/* Sol: Başlık */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
            style={{ backgroundColor: '#F3F4F6' }}
          >
            🪙
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700">LME Alüminyum</p>
            <p className="text-[10px] text-gray-400 truncate">
              {data.stale ? 'Önbellek • ' : ''}
              {data.date || formatSaat(data.fetchedAt)}
            </p>
          </div>
        </div>

        {/* Sağ: Fiyat + günlük değişim */}
        <div className="text-right flex-shrink-0">
          <p className="text-base font-bold text-gray-800 leading-tight">
            ${formatFiyat(data.price)}
            <span className="text-[10px] font-normal text-gray-400 ml-1">/ton</span>
          </p>
          {data.changePercent != null && (
            <p className="text-[11px] font-medium leading-tight" style={{ color: degisimRenk }}>
              {okIkon} {data.change != null && (data.change > 0 ? '+' : '')}
              {data.change != null ? formatFiyat(data.change) : ''}
              <span className="ml-1">
                ({data.changePercent > 0 ? '+' : ''}
                {data.changePercent.toFixed(2)}%)
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Alt şerit: aylık / yıllık */}
      {(data.monthPercent != null || data.yearPercent != null) && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
          {data.monthPercent != null && (
            <span>
              1 Ay:{' '}
              <span
                className="font-medium"
                style={{ color: data.monthPercent < 0 ? kirmizi : yesil }}
              >
                {data.monthPercent > 0 ? '+' : ''}
                {data.monthPercent.toFixed(2)}%
              </span>
            </span>
          )}
          {data.yearPercent != null && (
            <span>
              1 Yıl:{' '}
              <span
                className="font-medium"
                style={{ color: data.yearPercent < 0 ? kirmizi : yesil }}
              >
                {data.yearPercent > 0 ? '+' : ''}
                {data.yearPercent.toFixed(2)}%
              </span>
            </span>
          )}
          <span className="truncate ml-2" title={data.source}>
            {(data.source || '').split(' ')[0]}
          </span>
        </div>
      )}
    </div>
  )
}
