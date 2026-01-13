'use client';
export const dynamic = 'force-dynamic';

/**
 * DEMO-SEITE: Analytics
 * Zeigt detaillierte Statistiken und Metriken für Screenshots
 */

export default function AnalyticsDemoPage() {
  // Demo-Daten für Analytics
  const dailyStats = [
    { day: 'Mo', conversations: 324, messages: 1847, conversion: 12.3 },
    { day: 'Di', conversations: 412, messages: 2341, conversion: 15.2 },
    { day: 'Mi', conversations: 389, messages: 2156, conversion: 13.8 },
    { day: 'Do', conversations: 456, messages: 2893, conversion: 16.5 },
    { day: 'Fr', conversations: 398, messages: 2542, conversion: 14.1 },
    { day: 'Sa', conversations: 267, messages: 1423, conversion: 11.2 },
    { day: 'So', conversations: 189, messages: 987, conversion: 9.8 },
  ];

  const messageTypes = [
    { type: 'Text', count: 8234, percentage: 65, color: 'bg-blue-500' },
    { type: 'Bilder', count: 2341, percentage: 19, color: 'bg-green-500' },
    { type: 'Dokumente', count: 1256, percentage: 10, color: 'bg-yellow-500' },
    { type: 'Audio', count: 867, percentage: 6, color: 'bg-purple-500' },
  ];

  const topFlows = [
    { name: 'Begrüßungs-Flow', interactions: 2847, completion: 92 },
    { name: 'FAQ-Flow', interactions: 1956, completion: 87 },
    { name: 'Bestell-Flow', interactions: 1243, completion: 78 },
    { name: 'Support-Flow', interactions: 892, completion: 85 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-700 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">📊 Analytics Dashboard</h1>
              <p className="text-white/90 mb-1">
                Detaillierte Insights für <span className="font-semibold">Kundenservice Bot</span>
              </p>
              <p className="text-white/80 text-sm">
                Zeitraum: Letzte 7 Tage
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-6xl opacity-20">📈</div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="text-3xl font-bold text-gray-900 mb-1">2.435</div>
            <div className="text-sm text-gray-600">Gesamt Gespräche</div>
            <div className="text-xs text-green-600 mt-1">↑ 12.5% vs. Vorwoche</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="text-3xl font-bold text-gray-900 mb-1">14.189</div>
            <div className="text-sm text-gray-600">Nachrichten</div>
            <div className="text-xs text-green-600 mt-1">↑ 8.3% vs. Vorwoche</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="text-3xl font-bold text-gray-900 mb-1">14.2%</div>
            <div className="text-sm text-gray-600">Conversion Rate</div>
            <div className="text-xs text-green-600 mt-1">↑ 2.1% vs. Vorwoche</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="text-3xl font-bold text-gray-900 mb-1">4m 32s</div>
            <div className="text-sm text-gray-600">Ø Gesprächsdauer</div>
            <div className="text-xs text-blue-600 mt-1">→ Stabil</div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Activity Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Tägliche Aktivität</h3>
            <div className="space-y-4">
              {dailyStats.map((stat, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{stat.day}</span>
                    <span className="text-sm text-gray-600">{stat.conversations} Gespräche</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
                      style={{ width: `${(stat.conversations / 500) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{stat.messages} Nachrichten</span>
                    <span>{stat.conversion}% Conversion</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message Types */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Nachrichtentypen</h3>
            <div className="space-y-4">
              {messageTypes.map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-sm font-medium text-gray-700">{item.type}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{item.percentage}% der Nachrichten</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Flows */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Top Flow-Performance</h3>
          <div className="space-y-4">
            {topFlows.map((flow, idx) => (
              <div key={idx} className="border-b border-gray-200 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{flow.name}</h4>
                    <p className="text-sm text-gray-600">{flow.interactions} Interaktionen</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-brand-green">{flow.completion}%</div>
                    <div className="text-xs text-gray-500">Completion Rate</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-brand-green to-brand-dark h-2 rounded-full"
                    style={{ width: `${flow.completion}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-gradient-to-r from-brand-green to-brand-dark rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Daten exportieren</h3>
              <p className="text-white/90 text-sm">
                Laden Sie detaillierte Reports im CSV oder PDF Format herunter
              </p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors">
                CSV Export
              </button>
              <button className="px-4 py-2 bg-white text-brand-green hover:bg-white/90 rounded-lg text-sm font-semibold transition-colors">
                PDF Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






