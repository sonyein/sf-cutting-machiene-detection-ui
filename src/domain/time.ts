const kstFormatter = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Seoul' })

export function formatKstDateTime(timestamp: string | number): string {
  const parts = Object.fromEntries(kstFormatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]))
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`
}
